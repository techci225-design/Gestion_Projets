'use server'

import { createClient } from '@/lib/supabase/server'
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

  // Insert project
  const { data: project, error } = await supabase
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

  // Insert user as owner in project_members
  const { error: memberError } = await supabase
    .from('project_members')
    .insert({
      project_id: project.id,
      user_id: user.id,
      role: 'owner'
    })

  if (memberError) {
    return { error: memberError.message }
  }

  revalidatePath('/projects')
  return { success: true, projectId: project.id }
}
