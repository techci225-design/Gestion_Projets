'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { LogframeItem } from './logframe.actions'

export interface PtbaActivity {
  id: string
  project_id: string
  wbs_task_id?: string | null
  logframe_item_id: string | null
  code: string
  description: string
  responsible: string | null
  fiscal_year: number
  q1: boolean
  q2: boolean
  q3: boolean
  q4: boolean
  budget_planned: number
  created_at: string
  date_start?: string
  date_end?: string
  logframe_items?: Pick<LogframeItem, 'intervention_label'>
}

export async function getPtbaActivities(projectId: string, year: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ptba_activities')
    .select('*, logframe_items(intervention_label), wbs_tasks(date_start, date_end)')
    .eq('project_id', projectId)
    .eq('fiscal_year', year)
    .order('code', { ascending: true })

  if (error) {
    console.error('Error fetching PTBA:', error)
    throw new Error('Failed to fetch PTBA')
  }

  return data.map((d: any) => ({
    ...d,
    date_start: d.wbs_tasks?.date_start,
    date_end: d.wbs_tasks?.date_end
  })) as PtbaActivity[]
}

export async function addPtbaActivity(
  projectId: string,
  data: Omit<PtbaActivity, 'id' | 'project_id' | 'created_at' | 'logframe_items'>
) {
  const supabase = await createClient()
  const { date_start, date_end, ...ptbaData } = data;
  
  let wbsTaskId = data.wbs_task_id;

  // Créer la tâche globale WBS si on a les dates (synchronisation)
  if (!wbsTaskId && date_start && date_end) {
    const { data: wbsTask, error: wbsError } = await supabase.from('wbs_tasks').insert({
      project_id: projectId,
      code: data.code,
      description: data.description,
      responsible: data.responsible,
      date_start,
      date_end,
      budget_allocated: data.budget_planned
    }).select('id').single();
    
    if (wbsError) throw new Error('Failed to create WBS task: ' + wbsError.message);
    wbsTaskId = wbsTask.id;
  }

  const { data: item, error } = await supabase
    .from('ptba_activities')
    .insert([{ project_id: projectId, wbs_task_id: wbsTaskId, ...ptbaData }])
    .select('*, logframe_items(intervention_label)')
    .single()

  if (error) {
    console.error('Error adding PTBA activity:', error)
    throw new Error('Failed to add PTBA activity')
  }

  revalidatePath(`/projects/${projectId}/ptba`)
  return item as PtbaActivity
}

export async function updatePtbaActivity(
  projectId: string,
  id: string,
  data: Partial<Omit<PtbaActivity, 'id' | 'project_id' | 'created_at' | 'logframe_items'>>
) {
  const supabase = await createClient()
  const { date_start, date_end, ...ptbaData } = data;

  // Si on a un wbs_task_id, on met aussi à jour la tâche WBS
  if (ptbaData.wbs_task_id && (date_start || date_end || ptbaData.budget_planned !== undefined)) {
    await supabase.from('wbs_tasks').update({
      ...(date_start && { date_start }),
      ...(date_end && { date_end }),
      ...(ptbaData.budget_planned !== undefined && { budget_allocated: ptbaData.budget_planned }),
      ...(ptbaData.code && { code: ptbaData.code }),
      ...(ptbaData.description && { description: ptbaData.description }),
      ...(ptbaData.responsible !== undefined && { responsible: ptbaData.responsible })
    }).eq('id', ptbaData.wbs_task_id);
  }

  const { data: item, error } = await supabase
    .from('ptba_activities')
    .update(ptbaData)
    .eq('id', id)
    .eq('project_id', projectId)
    .select('*, logframe_items(intervention_label)')
    .single()

  if (error) {
    console.error('Error updating PTBA activity:', error)
    throw new Error('Failed to update PTBA activity')
  }

  revalidatePath(`/projects/${projectId}/ptba`)
  return item as PtbaActivity
}

export async function deletePtbaActivity(projectId: string, id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ptba_activities')
    .delete()
    .eq('id', id)
    .eq('project_id', projectId)

  if (error) {
    console.error('Error deleting PTBA activity:', error)
    throw new Error('Failed to delete PTBA activity')
  }

  revalidatePath(`/projects/${projectId}/ptba`)
}
