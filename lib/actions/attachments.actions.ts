'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

const attachmentTargetSchema = z.object({
  relatedTable: z.enum(['operations_journal', 'procurement_plan']),
  relatedId: z.string().uuid(),
})

const attachmentUploadSchema = attachmentTargetSchema.extend({
  projectId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
  fileType: z.enum([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]),
  filePath: z.string().min(1).max(1024),
})

export async function uploadAttachment(
  projectId: string,
  relatedTable: string,
  relatedId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  filePath: string
) {
  const parsed = attachmentUploadSchema.safeParse({
    projectId,
    relatedTable,
    relatedId,
    fileName,
    fileSize,
    fileType,
    filePath,
  })
  if (!parsed.success) return { error: 'Piece jointe invalide.' }

  const input = parsed.data
  const expectedPathPrefix = `${input.projectId}/${input.relatedTable}/${input.relatedId}/`
  if (!input.filePath.startsWith(expectedPathPrefix)) {
    return { error: 'Chemin de fichier invalide.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Get active org from user session / profiles? 
  // For attachments, we need the organization_id from the project
  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', input.projectId)
    .single()

  if (!project) return { error: 'Projet introuvable' }

  const { data: relatedRecord } = await supabase
    .from(input.relatedTable)
    .select('id')
    .eq('id', input.relatedId)
    .eq('project_id', input.projectId)
    .maybeSingle()

  if (!relatedRecord) return { error: 'Element associe introuvable pour ce projet.' }

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      project_id: input.projectId,
      organization_id: project.organization_id,
      related_table: input.relatedTable,
      related_id: input.relatedId,
      file_name: input.fileName,
      file_size: input.fileSize,
      file_type: input.fileType,
      storage_path: input.filePath,
      uploaded_by: user.id
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
    user_id: user.id,
    action: 'upload',
    entity_table: 'attachments',
    entity_id: data.id,
    project_id: input.projectId,
    after_data: { 
      file_name: input.fileName,
      file_size: input.fileSize,
      related_table: input.relatedTable,
      related_id: input.relatedId
    }
  })

  return { data }
}

export async function deleteAttachment(attachmentId: string) {
  const parsedAttachmentId = z.string().uuid().safeParse(attachmentId)
  if (!parsedAttachmentId.success) return { error: 'Piece jointe invalide.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const session = user ? { user } : null

  if (!session) return { error: 'Non autorisé' }

  // Get attachment details
  const { data: att } = await supabase
    .from('attachments')
    .select('*')
    .eq('id', parsedAttachmentId.data)
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
    .eq('id', parsedAttachmentId.data)

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
  const parsed = attachmentTargetSchema.safeParse({ relatedTable, relatedId })
  if (!parsed.success) return { data: [] }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('attachments')
    .select('*, profiles:uploaded_by (first_name, last_name, avatar_url)')
    .eq('related_table', parsed.data.relatedTable)
    .eq('related_id', parsed.data.relatedId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching attachments:', error)
    return { data: [] }
  }

  return { data }
}
