'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function uploadAttachment(
  projectId: string,
  relatedTable: string,
  relatedId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  filePath: string
) {
  const supabase = createServerActionClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: 'Non autorisé' }
  }

  // Get active org from user session / profiles? 
  // For attachments, we need the organization_id from the project
  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Projet introuvable' }

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      project_id: projectId,
      organization_id: project.organization_id,
      related_table: relatedTable,
      related_id: relatedId,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      storage_path: filePath,
      uploaded_by: session.user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error inserting attachment:', error)
    return { error: error.message }
  }

  // Log audit
  await supabase.from('audit_log').insert({
    organization_id: project.organization_id,
    user_id: session.user.id,
    action: 'upload',
    entity_table: 'attachments',
    entity_id: data.id,
    project_id: projectId,
    after_data: { 
      file_name: fileName, 
      file_size: fileSize, 
      related_table: relatedTable, 
      related_id: relatedId 
    }
  })

  return { data }
}

export async function deleteAttachment(attachmentId: string) {
  const supabase = createServerActionClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return { error: 'Non autorisé' }

  // Get attachment details
  const { data: att } = await supabase
    .from('attachments')
    .select('*')
    .eq('id', attachmentId)
    .single()

  if (!att) return { error: 'Fichier introuvable' }

  // Delete from storage
  const { error: storageError } = await supabase
    .storage
    .from('attachments')
    .remove([att.storage_path])
    
  if (storageError) {
    console.error('Error removing from storage:', storageError)
    // Continue anyway to clean up db record
  }

  // Delete from DB
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId)

  if (error) {
    console.error('Error deleting attachment:', error)
    return { error: error.message }
  }

  // Log audit
  await supabase.from('audit_log').insert({
    organization_id: att.organization_id,
    user_id: session.user.id,
    action: 'delete',
    entity_table: 'attachments',
    entity_id: att.id,
    project_id: att.project_id,
    after_data: { 
      file_name: att.file_name, 
      file_size: att.file_size, 
      related_table: att.related_table, 
      related_id: att.related_id 
    }
  })

  return { success: true }
}

export async function getAttachments(relatedTable: string, relatedId: string) {
  const supabase = createServerActionClient({ cookies })
  
  const { data, error } = await supabase
    .from('attachments')
    .select('*, profiles:uploaded_by (first_name, last_name, avatar_url)')
    .eq('related_table', relatedTable)
    .eq('related_id', relatedId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching attachments:', error)
    return { data: [] }
  }

  return { data }
}
