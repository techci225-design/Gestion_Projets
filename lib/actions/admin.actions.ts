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
