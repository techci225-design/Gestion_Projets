import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Récupérer tous les projets
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')

    if (projectsError || !projects) {
      throw new Error('Erreur récupération projets: ' + projectsError?.message)
    }

    let notificationsCreated = 0

    // Fonction utilitaire pour éviter les doublons dans les dernières 24h
    const notifyMembers = async (
      projectId: string, 
      type: string, 
      title: string, 
      body: string, 
      link: string, 
      roles: string[]
    ) => {
      // Vérifier si une notification similaire existe déjà dans les 24h
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('project_id', projectId)
        .eq('type', type)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)

      if (existingNotif && existingNotif.length > 0) {
        return // Déjà notifié
      }

      // Récupérer les membres cibles
      const { data: members } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .in('role', roles)

      if (members && members.length > 0) {
        const notificationsToInsert = members.map(m => ({
          user_id: m.user_id,
          project_id: projectId,
          type,
          title,
          body,
          link
        }))

        const { error } = await supabase.from('notifications').insert(notificationsToInsert)
        if (!error) notificationsCreated += notificationsToInsert.length
      }
    }

    // Parcourir chaque projet
    for (const project of projects) {
      const pid = project.id

      // A. BUDGET
      const { data: budgetData } = await supabase
        .from('v_budget_consumption')
        .select('*')
        .eq('project_id', pid)
        .in('niveau_alerte', ['orange', 'rouge'])

      if (budgetData) {
        for (const b of budgetData) {
          if (b.taux_consommation >= 1.0) {
            await notifyMembers(
              pid,
              'budget_seuil_100',
              'Budget dépassé',
              `La ligne budgétaire "${b.name}" a dépassé 100% de consommation.`,
              `/projects/${pid}/budget`,
              ['owner', 'chef_projet', 'comptable']
            )
          } else if (b.taux_consommation >= 0.8) {
            await notifyMembers(
              pid,
              'budget_seuil_80',
              'Alerte budget (80%)',
              `La ligne budgétaire "${b.name}" a atteint ${Math.round(b.taux_consommation * 100)}% de consommation.`,
              `/projects/${pid}/budget`,
              ['owner', 'chef_projet', 'comptable']
            )
          }
        }
      }

      // B. MARCHÉS
      const { data: markets } = await supabase
        .from('procurement_plan')
        .select('*')
        .eq('project_id', pid)

      if (markets) {
        const now = new Date()
        const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)

        for (const m of markets) {
          const plannedNotice = m.planned_notice_date ? new Date(m.planned_notice_date) : null
          const plannedSignature = m.contract_signature_date ? new Date(m.contract_signature_date) : null

          // Echéance dépassée
          if ((plannedNotice && plannedNotice < now && m.status === 'planifié') ||
              (plannedSignature && plannedSignature < now && m.status !== 'signé')) {
            await notifyMembers(
              pid,
              'marche_echeance_depassee',
              'Échéance de marché dépassée',
              `Le marché "${m.description}" a une échéance dépassée.`,
              `/projects/${pid}/marches`,
              ['owner', 'chef_projet']
            )
          }
          // Echéance proche (dans les 15 jours)
          else if ((plannedNotice && plannedNotice >= now && plannedNotice <= in15Days && m.status === 'planifié') ||
                   (plannedSignature && plannedSignature >= now && plannedSignature <= in15Days && m.status !== 'signé')) {
            await notifyMembers(
              pid,
              'marche_echeance_proche',
              'Échéance de marché proche',
              `Le marché "${m.description}" arrive à échéance dans moins de 15 jours.`,
              `/projects/${pid}/marches`,
              ['owner', 'chef_projet']
            )
          }
        }
      }

      // C. RISQUES
      const { data: risks } = await supabase
        .from('risks')
        .select('*')
        .eq('project_id', pid)
        .eq('criticality', 9)
        .eq('status', 'ouvert')

      if (risks) {
        for (const r of risks) {
          await notifyMembers(
            pid,
            'risque_critique',
            'Risque Critique Détecté',
            `Le risque "${r.title}" est classé critique (9/9).`,
            `/projects/${pid}/risques`,
            ['owner', 'chef_projet']
          )
        }
      }

      // D. EVM
      const { data: evm } = await supabase
        .from('v_evm_project_summary')
        .select('*')
        .eq('project_id', pid)
        .single()

      if (evm) {
        if (evm.cpi_global !== null && evm.cpi_global < 0.90) {
          await notifyMembers(
            pid,
            'cpi_alerte',
            'Alerte EVM : Coût',
            `L'indice de performance des coûts (CPI) est à ${Number(evm.cpi_global).toFixed(2)}. Un dépassement de budget est probable.`,
            `/projects/${pid}/evm`,
            ['owner', 'chef_projet']
          )
        }
        if (evm.spi_global !== null && evm.spi_global < 0.90) {
          await notifyMembers(
            pid,
            'spi_alerte',
            'Alerte EVM : Délai',
            `L'indice de performance des délais (SPI) est à ${Number(evm.spi_global).toFixed(2)}. Un retard est probable.`,
            `/projects/${pid}/evm`,
            ['owner', 'chef_projet']
          )
        }
      }
    }

    // 2. Nettoyage des invitations expirées
    const { error: expireError } = await supabase
      .from('invitations')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())

    if (expireError) {
      console.error('Erreur expiration invitations:', expireError)
    }

    return new Response(JSON.stringify({ success: true, notificationsCreated }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Check alerts error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
