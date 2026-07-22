'use server'

import { createClient } from '@/lib/supabase/server'

export async function addComment(
  projectId: string,
  relatedTable: string,
  relatedId: string,
  content: string
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: 'Non autorisé' }
  }

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Projet introuvable' }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      project_id: projectId,
      organization_id: project.organization_id,
      related_table: relatedTable,
      related_id: relatedId,
      content,
      author_id: session.user.id
    })
    .select('*, profiles:author_id (first_name, last_name, avatar_url)')
    .single()

  if (error) {
    console.error('Error adding comment:', error)
    return { error: error.message }
  }

  return { data }
}

export async function updateComment(commentId: string, content: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return { error: 'Non autorisé' }

  const { data, error } = await supabase
    .from('comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select('*, profiles:author_id (first_name, last_name, avatar_url)')
    .single()

  if (error) {
    console.error('Error updating comment:', error)
    return { error: error.message }
  }

  return { data }
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return { error: 'Non autorisé' }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('Error deleting comment:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function getComments(relatedTable: string, relatedId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles:author_id (first_name, last_name, avatar_url)')
    .eq('related_table', relatedTable)
    .eq('related_id', relatedId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching comments:', error)
    return { data: [] }
  }

  return { data }
}
