'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function checkProjectLimit(orgId: string, adminClient: any) {
  // Get org max projects
  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .select('max_projects')
    .eq('id', orgId)
    .single()

  if (orgError || !org) {
    return { error: "Erreur lors de la vérification de l'organisation." }
  }

  // Get active projects count
  const { count, error: countError } = await adminClient
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .neq('status', 'clos')

  if (countError) {
    return { error: "Erreur lors du comptage des projets." }
  }

  if (count !== null && count >= org.max_projects) {
    return { 
      limitReached: true, 
      error: `Vous avez atteint la limite de ${org.max_projects} projets actifs de votre plan. Contactez TSBC pour passer au plan supérieur.` 
    }
  }

  return { limitReached: false }
}

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const name = formData.get('name') as string
  const code = formData.get('code') as string
  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string

  if (!name) {
    return { error: 'Le nom du projet est requis' }
  }

  let adminClient;
  try {
    adminClient = createAdminClient()
  } catch (err: any) {
    return { error: 'Erreur de configuration serveur (Clé Admin manquante ou invalide). Veuillez vérifier la variable SUPABASE_SERVICE_ROLE_KEY sur Vercel.' }
  }

  // Get active organization
  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get('active_org_id')?.value

  if (!activeOrgId) {
    return { error: 'Aucune organisation sélectionnée' }
  }

  // Check user role in this organization
  const { data: memberData } = await supabase
    .from('organization_members')
    .select('org_role')
    .eq('user_id', user.id)
    .eq('organization_id', activeOrgId)
    .single()

  if (!memberData || !['owner', 'admin'].includes(memberData.org_role)) {
    return { error: "Vous n'avez pas les droits (owner/admin) pour créer un projet dans cette organisation." }
  }

  // Check plan limits
  const limitCheck = await checkProjectLimit(activeOrgId, adminClient)
  if (limitCheck.limitReached) {
    return { error: limitCheck.error, type: 'LIMIT_REACHED' }
  }
  if (limitCheck.error) {
    return { error: limitCheck.error }
  }

  // Insert project
  let project;
  try {
    const { data, error } = await adminClient
      .from('projects')
      .insert({
        name,
        code: code || null,
        start_date: startDate || null,
        end_date: endDate || null,
        created_by: user.id,
        organization_id: activeOrgId
      })
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }
    project = data;
  } catch (err: any) {
    return { error: err.message || 'Erreur inconnue lors de la création du projet.' }
  }

  // Insert user as owner in project_members
  try {
    const { error: memberError } = await adminClient
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: 'owner'
      })

    if (memberError) {
      return { error: memberError.message }
    }
  } catch (err: any) {
    return { error: err.message || 'Erreur inconnue lors de l\'ajout du membre.' }
  }

  revalidatePath('/projects')
  return { success: true, projectId: project.id }
}

export async function createProjectWithBudget(payload: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  if (!payload.name || !payload.code || !payload.start_date || !payload.end_date) {
    return { error: 'Les informations du projet sont incomplètes' }
  }

  if (!payload.funding_sources || payload.funding_sources.length === 0) {
    return { error: 'Au moins un bailleur est requis' }
  }

  if (!payload.budget_lines || payload.budget_lines.length === 0) {
    return { error: 'Au moins une ligne budgétaire est requise' }
  }

  let adminClient;
  try {
    adminClient = createAdminClient()
  } catch (err: any) {
    return { error: 'Erreur de configuration serveur (Clé Admin manquante).' }
  }

  // Get active organization
  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get('active_org_id')?.value

  if (!activeOrgId) {
    return { error: 'Aucune organisation sélectionnée' }
  }

  const supabase = await createClient()

  // SÉCURITÉ CRITIQUE : Vérifier que l'utilisateur appartient bien à l'organisation (owner ou admin)
  const { data: memberData } = await supabase
    .from('organization_members')
    .select('org_role')
    .eq('user_id', user.id)
    .eq('organization_id', activeOrgId)
    .single()

  if (!memberData || !['owner', 'admin'].includes(memberData.org_role)) {
    return { error: "Vous n'avez pas les droits (owner/admin) pour créer un projet dans cette organisation." }
  }

  // Check plan limits
  const limitCheck = await checkProjectLimit(activeOrgId, adminClient)
  if (limitCheck.limitReached) {
    return { error: limitCheck.error, type: 'LIMIT_REACHED' }
  }
  if (limitCheck.error) {
    return { error: limitCheck.error }
  }

  try {
    const { data: projectId, error } = await adminClient.rpc('create_project_with_budget', {
      payload: {
        ...payload,
        user_id: user.id,
        organization_id: activeOrgId
      }
    })

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/projects')
    return { success: true, projectId }
  } catch (err: any) {
    return { error: err.message || 'Erreur inconnue lors de la création du projet avec budget.' }
  }
}
