import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch all active organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')

    if (orgsError || !orgs) {
      throw new Error('Erreur récupération organisations: ' + orgsError?.message)
    }

    let emailsSent = 0

    // For each organization
    for (const org of orgs) {
      const orgId = org.id
      const orgName = org.name

      // Fetch active projects for this organization
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, code')
        .eq('organization_id', orgId)
        .eq('status', 'actif')

      if (!projects || projects.length === 0) continue

      let projectsHtml = ''

      for (const p of projects) {
        const pid = p.id
        
        // Fetch EVM & Budget data
        const { data: evm } = await supabase
          .from('v_evm_project_summary')
          .select('*')
          .eq('project_id', pid)
          .single()
        
        const bac = evm?.bac_total || 0
        const ac = evm?.ac_total || 0
        const percentConsumed = bac > 0 ? ((ac / bac) * 100).toFixed(0) : 0
        
        const cpi = evm?.cpi_global !== null ? evm.cpi_global.toFixed(2) : 'N/A'
        const cpiColor = evm?.cpi_global !== null ? (evm.cpi_global >= 1 ? '🟢' : evm.cpi_global >= 0.9 ? '🟡' : '🔴') : ''
        
        const spi = evm?.spi_global !== null ? evm.spi_global.toFixed(2) : 'N/A'
        const spiColor = evm?.spi_global !== null ? (evm.spi_global >= 1 ? '🟢' : evm.spi_global >= 0.9 ? '🟡' : '🔴') : ''

        // Fetch closest market deadline
        const { data: markets } = await supabase
          .from('procurement_plan')
          .select('description, planned_notice_date, contract_signature_date, status')
          .eq('project_id', pid)
          .not('status', 'eq', 'signé')
          .order('planned_notice_date', { ascending: true })
          .limit(1)

        let nextMarket = 'Aucune'
        if (markets && markets.length > 0) {
          const d = markets[0].planned_notice_date || markets[0].contract_signature_date
          if (d) nextMarket = new Date(d).toLocaleDateString('fr-FR')
        }

        projectsHtml += `
          <div style="margin-bottom: 20px; padding: 10px; border-left: 4px solid #1E3A5F; background-color: #F8FAFC;">
            <h4 style="margin: 0 0 5px 0;">📁 ${p.name} (${p.code})</h4>
            <p style="margin: 2px 0;">Budget : ${new Intl.NumberFormat('fr-FR').format(bac)} FCFA | Consommé : ${percentConsumed}%</p>
            <p style="margin: 2px 0;">CPI : ${cpi} ${cpiColor} | SPI : ${spi} ${spiColor}</p>
            <p style="margin: 2px 0;">Prochaine échéance marché : ${nextMarket}</p>
          </div>
        `
      }

      // Fetch active alerts for this organization's projects (last 7 days, not read)
      const projectIds = projects.map(p => p.id)
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data: alerts } = await supabase
        .from('notifications')
        .select('type, title, created_at, project_id, projects(name)')
        .in('project_id', projectIds)
        .eq('read', false)
        .gte('created_at', lastWeek)
        .order('created_at', { ascending: false })
        .limit(10)

      let alertsHtml = '<p>Aucune nouvelle alerte cette semaine.</p>'
      if (alerts && alerts.length > 0) {
        alertsHtml = '<ul style="padding-left: 20px;">'
        for (const a of alerts) {
          alertsHtml += `<li><strong>${a.title}</strong> — ${a.projects?.name} — ${new Date(a.created_at).toLocaleDateString('fr-FR')}</li>`
        }
        alertsHtml += '</ul>'
      }

      // Action recommendations based on alerts
      let actionsHtml = ''
      if (alerts && alerts.length > 0) {
        actionsHtml = '<ul style="padding-left: 20px;">'
        const seenTypes = new Set()
        for (const a of alerts) {
          if (!seenTypes.has(a.type)) {
            seenTypes.add(a.type)
            if (a.type === 'cpi_alerte') actionsHtml += `<li>Revoyez les coûts du projet <strong>${a.projects?.name}</strong></li>`
            if (a.type.startsWith('budget_seuil')) actionsHtml += `<li>Préparez un appel de fonds pour <strong>${a.projects?.name}</strong></li>`
            if (a.type.startsWith('marche_echeance')) actionsHtml += `<li>Vérifiez les échéances de marché pour <strong>${a.projects?.name}</strong></li>`
          }
        }
        actionsHtml += '</ul>'
      }
      if (!actionsHtml) actionsHtml = '<p>Aucune action critique requise.</p>'

      // Fetch org members to notify (owner, admin, chef_projet)
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId)
        .in('org_role', ['owner', 'admin', 'chef_projet'])

      if (!members || members.length === 0) continue

      for (const m of members) {
        // Check preferences
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, notif_email_weekly')
          .eq('id', m.user_id)
          .single()

        if (profile && profile.notif_email_weekly === false) continue

        const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Utilisateur'

        const { data: userData } = await supabase.auth.admin.getUserById(m.user_id)
        const toEmail = userData?.user?.email

        if (toEmail) {
          const emailHtml = `
            <div style="font-family: sans-serif; color: #1E3A5F; line-height: 1.5; max-width: 600px; margin: 0 auto;">
              <p>Bonjour ${firstName},</p>
              <p>Voici le bilan de la semaine pour <strong>${orgName}</strong> :</p>
              
              <h3 style="border-bottom: 2px solid #1E3A5F; padding-bottom: 5px;">─── PROJETS ACTIFS ───</h3>
              ${projectsHtml}

              <h3 style="border-bottom: 2px solid #1E3A5F; padding-bottom: 5px;">─── ALERTES ACTIVES ───</h3>
              ${alertsHtml}

              <h3 style="border-bottom: 2px solid #1E3A5F; padding-bottom: 5px;">─── ACTIONS RECOMMANDÉES ───</h3>
              ${actionsHtml}

              <p style="margin-top: 30px;">Accédez à votre tableau de bord :<br/>
              <a href="https://gestion-projets-e3uj.vercel.app/projects" style="color: #16A34A; font-weight: bold;">Ouvrir ProjetPilote</a></p>
              
              <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #64748B;">ProjetPilote — TSBC | tsbcafrique@yahoo.fr</p>
            </div>
          `

          if (RESEND_API_KEY) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: 'ProjetPilote <reports@projetpilote.com>',
                to: [toEmail],
                subject: `📊 Rapport hebdomadaire ProjetPilote — Semaine ${getWeekNumber(new Date())}`,
                html: emailHtml,
              }),
            }).catch(e => console.error("Email send error", e))
            emailsSent++
          } else {
            console.log(`[Email Log] To: ${toEmail}, Subject: Rapport hebdomadaire ProjetPilote`)
            emailsSent++
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Weekly report error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return weekNo
}
