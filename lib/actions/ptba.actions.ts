'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { LogframeItem } from './logframe.actions'
import { hasProjectPermission, ProjectRole } from '../permissions/project-permissions'
import { z } from 'zod'

export interface PtbaActivity {
  id: string
  project_id: string
  wbs_task_id?: string | null
  budget_line_id?: string | null
  logframe_item_id: string | null
  code?: string
  description?: string
  responsible?: string | null
  fiscal_year: number
  q1: boolean
  q2: boolean
  q3: boolean
  q4: boolean
  budget_planned: number
  created_at: string
  wbs_tasks?: {
    code: string
    name: string
    responsible_user_id: string | null
    date_start: string
    date_end: string
  }
  budget_lines?: {
    code: string
    label: string
  }
  logframe_items?: Pick<LogframeItem, 'intervention_label'>
}

const PtbaActivitySchema = z.object({
  wbs_task_id: z.string().uuid(),
  budget_line_id: z.string().uuid().nullable().optional(),
  fiscal_year: z.number().int().min(2000).max(2100),
  q1: z.boolean(),
  q2: z.boolean(),
  q3: z.boolean(),
  q4: z.boolean(),
  budget_planned: z.number().min(0).default(0)
})

async function requirePermission(projectId: string, action: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non autorisé")

  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  const userRole = member?.role
  if (!userRole) throw new Error("Accès refusé")

  // On aligne les permissions avec view_tasks / edit_tasks ou edit_budget
  const mappedAction: any = action === 'edit' ? 'edit_tasks' : 'view_tasks'
  
  if (!hasProjectPermission(userRole as ProjectRole, mappedAction)) {
    throw new Error("Permissions insuffisantes")
  }
  return { user, userRole }
}

export async function getPtbaActivities(projectId: string, year: number) {
  try {
    await requirePermission(projectId, 'view')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('ptba_activities')
      .select(`
        *,
        logframe_items(intervention_label),
        wbs_tasks(code, name, date_start, date_end, responsible_user_id),
        budget_lines(code, label)
      `)
      .eq('project_id', projectId)
      .eq('fiscal_year', year)
      // On filtre uniquement ceux qui sont liés au WBS pour le nouveau PTBA
      .not('wbs_task_id', 'is', null)

    if (error) {
      console.error('Error fetching PTBA:', error)
      throw new Error('Failed to fetch PTBA')
    }

    // Sort by WBS Code
    const sortedData = (data as any[]).sort((a, b) => {
      const codeA = a.wbs_tasks?.code || ''
      const codeB = b.wbs_tasks?.code || ''
      const aParts = codeA.split('.').map(Number)
      const bParts = codeB.split('.').map(Number)
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        if (aParts[i] === undefined) return -1
        if (bParts[i] === undefined) return 1
        if (aParts[i] !== bParts[i]) return (aParts[i] || 0) - (bParts[i] || 0)
      }
      return 0
    })

    return sortedData as PtbaActivity[]
  } catch (err: any) {
    console.error(err)
    return []
  }
}

export async function addPtbaActivity(projectId: string, data: any) {
  try {
    await requirePermission(projectId, 'edit')
    
    // Ensure empty string is null for UUIDs
    if (data.budget_line_id === '') data.budget_line_id = null

    const validatedData = PtbaActivitySchema.parse(data)
    const supabase = await createClient()

    // 1. Verify WBS Task exists and belongs to project
    const { data: task, error: taskErr } = await supabase
      .from('wbs_tasks')
      .select('id')
      .eq('id', validatedData.wbs_task_id)
      .eq('project_id', projectId)
      .single()

    if (taskErr || !task) throw new Error("Tâche WBS introuvable dans ce projet")

    // 2. Insert into PTBA
    const { data: item, error } = await supabase
      .from('ptba_activities')
      .insert([{ 
        project_id: projectId, 
        wbs_task_id: validatedData.wbs_task_id,
        budget_line_id: validatedData.budget_line_id,
        fiscal_year: validatedData.fiscal_year,
        q1: validatedData.q1,
        q2: validatedData.q2,
        q3: validatedData.q3,
        q4: validatedData.q4,
        budget_planned: validatedData.budget_planned,
        // Fill legacy text fields with placeholder to satisfy NOT NULL constraints if they exist
        code: 'SYNC',
        description: 'SYNC'
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new Error("Cette activité WBS est déjà programmée pour cette année fiscale.")
      throw error
    }

    revalidatePath(`/projects/${projectId}/ptba`)
    return { success: true, data: item }
  } catch (err: any) {
    console.error('Error adding PTBA activity:', err)
    return { error: err.message || "Erreur lors de l'ajout" }
  }
}

export async function updatePtbaActivity(projectId: string, id: string, data: any) {
  try {
    await requirePermission(projectId, 'edit')
    
    if (data.budget_line_id === '') data.budget_line_id = null
    const validatedData = PtbaActivitySchema.partial().parse(data)
    const supabase = await createClient()

    const { data: item, error } = await supabase
      .from('ptba_activities')
      .update({
        budget_line_id: validatedData.budget_line_id,
        q1: validatedData.q1,
        q2: validatedData.q2,
        q3: validatedData.q3,
        q4: validatedData.q4,
        budget_planned: validatedData.budget_planned
      })
      .eq('id', id)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/projects/${projectId}/ptba`)
    return { success: true, data: item }
  } catch (err: any) {
    console.error('Error updating PTBA activity:', err)
    return { error: err.message || "Erreur lors de la mise à jour" }
  }
}

export async function deletePtbaActivity(projectId: string, id: string) {
  try {
    await requirePermission(projectId, 'edit')
    const supabase = await createClient()

    const { error } = await supabase
      .from('ptba_activities')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId)

    if (error) throw error

    revalidatePath(`/projects/${projectId}/ptba`)
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting PTBA activity:', err)
    return { error: err.message || "Erreur lors de la suppression" }
  }
}
