'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function checkSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  return profile?.is_super_admin === true
}

export async function updateOrganizationPlan(orgId: string, plan: 'trial' | 'pro' | 'institutionnel', maxProjects: number) {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) return { error: 'Accès non autorisé' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('organizations')
    .update({ plan, max_projects: maxProjects })
    .eq('id', orgId)

  if (error) return { error: 'Erreur lors de la mise à jour du plan' }
  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function toggleOrganizationStatus(orgId: string, isActive: boolean) {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) return { error: 'Accès non autorisé' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('organizations')
    .update({ is_active: isActive })
    .eq('id', orgId)

  if (error) return { error: 'Erreur lors du changement de statut' }
  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function deleteOrganization(orgId: string) {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) return { error: 'Accès non autorisé' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('organizations')
    .delete()
    .eq('id', orgId)

  if (error) {
    console.error('Erreur lors de la suppression de l\'organisation:', error)
    // Sometimes cascading constraints might block deletion if we didn't setup ON DELETE CASCADE
    return { error: 'Erreur lors de la suppression. Assurez-vous de vider les projets de cette organisation d\'abord.' }
  }
  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function getAdminUsers() {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) throw new Error('Accès non autorisé')

  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      created_at,
      organization_members (
        org_role,
        organizations (
          id,
          name,
          plan
        )
      ),
      project_members ( count ),
      invitations!invited_by ( id, status )
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Erreur Supabase (getAdminUsers) :', error)
    throw new Error('Impossible de charger les utilisateurs')
  }
  
  // Format the data to match the expected flat structure
  const formattedData = data.map((p: any) => {
    const orgMember = p.organization_members && p.organization_members.length > 0 ? p.organization_members[0] : null
    const pendingInvitations = p.invitations ? p.invitations.filter((i: any) => i.status === 'pending').length : 0
    const totalInvitations = p.invitations ? p.invitations.length : 0
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      created_at: p.created_at,
      organization_id: orgMember?.organizations?.id || null,
      organization_name: orgMember?.organizations?.name || null,
      organization_plan: orgMember?.organizations?.plan || null,
      org_role: orgMember?.org_role || null,
      nb_projects: p.project_members && p.project_members.length > 0 ? p.project_members[0].count : 0,
      pending_invitations: pendingInvitations,
      total_invitations: totalInvitations
    }
  })
  
  return formattedData || []
}

export async function generatePasswordResetLink(email: string) {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) return { error: 'Accès non autorisé' }

  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
  })
  
  if (error) {
    console.error('generatePasswordResetLink error:', error)
    return { error: 'Erreur lors de la génération du lien' }
  }
  
  return { link: data.properties.action_link }
}

export async function deleteAdminUser(userId: string) {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) return { error: 'Accès non autorisé' }

  const adminClient = createAdminClient()

  // Ensure they don't delete themselves
  const { data: { user } } = await adminClient.auth.getUser()
  if (user && user.id === userId) {
    return { error: 'Vous ne pouvez pas supprimer votre propre compte.' }
  }

  // Manual cleanup to prevent foreign key constraint violations
  await adminClient.from('project_members').delete().eq('user_id', userId)
  await adminClient.from('organization_members').delete().eq('user_id', userId)
  
  // Clean up audit logs and invitations where this user was involved
  await adminClient.from('audit_log').delete().eq('user_id', userId)
  await adminClient.from('invitations').delete().eq('invited_by', userId)

  // Set foreign keys to NULL to avoid constraint errors
  await adminClient.from('projects').update({ created_by: null }).eq('created_by', userId)
  await adminClient.from('attachments').update({ uploaded_by: null }).eq('uploaded_by', userId)

  // Finally delete from profiles
  const { error: profileErr } = await adminClient.from('profiles').delete().eq('id', userId)
  if (profileErr) {
    console.error('Erreur suppression profile:', profileErr)
  }

  // Delete from Auth system
  const { error } = await adminClient.auth.admin.deleteUser(userId)

  if (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error)
    return { error: 'Erreur technique lors de la suppression. Veuillez vérifier les logs Vercel.' }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function getAdminStatistics() {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) throw new Error('Accès non autorisé')

  const adminClient = createAdminClient()
  
  // 1. Settings (for MRR)
  const { data: settings } = await adminClient.from('platform_settings').select('*').eq('id', 1).single()
  const proPrice = settings?.pro_price || 25000
  const instPrice = settings?.inst_price || 100000

  // 2. All Organizations
  const { data: orgsData } = await adminClient.from('organizations').select('id, name, plan, is_active, created_at, projects(id)')
  const orgs = orgsData || []
  
  const totalOrgs = orgs.length
  const activeOrgsCount = orgs.filter(o => o.is_active).length
  const proOrgsCount = orgs.filter(o => o.plan === 'pro').length
  const trialOrgsCount = orgs.filter(o => o.plan === 'trial').length
  const instOrgsCount = orgs.filter(o => o.plan === 'institutionnel').length

  const mrr = (proOrgsCount * proPrice) + (instOrgsCount * instPrice)
  const activatedOrgs = orgs.filter(o => o.projects && o.projects.length > 0).length
  const activationRate = totalOrgs > 0 ? Math.round((activatedOrgs / totalOrgs) * 100) : 0
  const conversionRate = totalOrgs > 0 ? Math.round((proOrgsCount / totalOrgs) * 100) : 0

  // 3. Active Projects & Budget
  const { count: activeProjectsCount } = await adminClient.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'actif')
  const { data: budgetData } = await adminClient.from('budget_lines').select('initial_allocated_amount')
  const totalBudget = (budgetData || []).reduce((sum, line) => sum + (line.initial_allocated_amount || 0), 0)

  // 4. Sessions (Engagement & Churn)
  const { data: sessions } = await adminClient.from('user_sessions').select('organization_id, last_seen_at')
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  
  const orgLastSeen = new Map<string, string>()
  sessions?.forEach(s => {
    if (!orgLastSeen.has(s.organization_id) || new Date(s.last_seen_at) > new Date(orgLastSeen.get(s.organization_id)!)) {
      orgLastSeen.set(s.organization_id, s.last_seen_at)
    }
  })

  let engagedOrgsCount = 0
  const churnRisk = []

  for (const org of orgs) {
    const lastSeen = orgLastSeen.get(org.id)
    if (lastSeen && lastSeen >= sevenDaysAgo) {
      engagedOrgsCount++
    } else {
      churnRisk.push({
        id: org.id,
        name: org.name,
        plan: org.plan,
        nb_projects: org.projects?.length || 0,
        last_seen_at: lastSeen || null
      })
    }
  }

  // Sort churn risk by last seen (oldest first, nulls first)
  churnRisk.sort((a, b) => {
    if (!a.last_seen_at) return -1
    if (!b.last_seen_at) return 1
    return new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime()
  })
  
  const engagementRate = activeOrgsCount > 0 ? Math.round((engagedOrgsCount / activeOrgsCount) * 100) : 0

  // 5. Graph: Registrations by week (last 12 weeks)
  const graphData = []
  const msInWeek = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now - (i * msInWeek))
    const weekEnd = new Date(now - ((i - 1) * msInWeek))
    const weekOrgs = orgs.filter(o => {
      const d = new Date(o.created_at)
      return d >= weekStart && d < weekEnd
    })
    graphData.push({
      week: `S-${i}`,
      total: weekOrgs.length,
      pro: weekOrgs.filter(o => o.plan === 'pro').length
    })
  }

  // 6. Module Usage
  const { count: journalCount } = await adminClient.from('operations_journal').select('*', { count: 'exact', head: true })
  const { count: evmCount } = await adminClient.from('wbs_tasks').select('*', { count: 'exact', head: true })
  const { count: procurementCount } = await adminClient.from('procurement_plan').select('*', { count: 'exact', head: true })
  const { count: risksCount } = await adminClient.from('risks').select('*', { count: 'exact', head: true })

  const moduleUsage = [
    { name: 'Journal Opérations', count: journalCount || 0 },
    { name: 'EVM Tâches', count: evmCount || 0 },
    { name: 'Marchés', count: procurementCount || 0 },
    { name: 'Risques', count: risksCount || 0 }
  ].sort((a, b) => b.count - a.count)
    
  return {
    kpis: {
      totalOrgs,
      activeOrgs: activeOrgsCount,
      activeProjects: activeProjectsCount || 0,
      totalBudget,
      proOrgs: proOrgsCount,
      trialOrgs: trialOrgsCount,
      instOrgs: instOrgsCount,
      mrr,
      activationRate,
      engagementRate,
      conversionRate
    },
    churnRisk,
    graphData,
    moduleUsage
  }
}
export async function updatePlatformSettings(settings: { pro_price: number, inst_price: number, exchange_rate_eur: number, exchange_rate_usd: number }) {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) return { error: 'Accès non autorisé' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('platform_settings')
    .update(settings)
    .eq('id', 1)

  if (error) return { error: 'Erreur lors de la mise à jour des paramètres' }
  revalidatePath('/admin/settings')
  return { success: true }
}


