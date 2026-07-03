'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

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
        created_by: user.id
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
