'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { hasProjectPermission, ProjectRole } from '../permissions/project-permissions'
import { recalculateSummaryDates } from './wbs.actions'

const UpdateDatesSchema = z.object({
  date_start: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Date de début invalide" }),
  date_end: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Date de fin invalide" }),
}).refine(data => new Date(data.date_start) <= new Date(data.date_end), {
  message: "La date de début doit être antérieure ou égale à la date de fin",
  path: ["date_end"]
});

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

  const mappedAction: any = action === 'edit' ? 'edit_tasks' : 'view_tasks'
  
  if (!hasProjectPermission(userRole as ProjectRole, mappedAction)) {
    throw new Error("Permissions insuffisantes")
  }
  return { user, userRole }
}

export async function updateTaskDates(projectId: string, taskId: string, startDate: string, endDate: string) {
  try {
    await requirePermission(projectId, 'edit')
    
    const validatedData = UpdateDatesSchema.parse({ date_start: startDate, date_end: endDate })
    
    const supabase = await createClient()

    // Enforce that task belongs to the project
    const { data: taskExists, error: checkError } = await supabase
      .from('wbs_tasks')
      .select('id, task_type')
      .eq('id', taskId)
      .eq('project_id', projectId)
      .single()

    if (checkError || !taskExists) {
      return { error: "Activité introuvable ou n'appartenant pas à ce projet." }
    }

    const { data: updated, error } = await supabase
      .from('wbs_tasks')
      .update({
        date_start: validatedData.date_start,
        date_end: validatedData.date_end
      })
      .eq('id', taskId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) throw error

    await recalculateSummaryDates(supabase, projectId)

    revalidatePath(`/projects/${projectId}/planning`)
    return { success: true, data: updated }
  } catch (err: any) {
    console.error(err)
    return { error: err.message || "Erreur lors de la mise à jour des dates" }
  }
}
