'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { LogframeItem } from './logframe.actions'

export interface PtbaActivity {
  id: string
  project_id: string
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
  logframe_items?: Pick<LogframeItem, 'intervention_label'>
}

export async function getPtbaActivities(projectId: string, year: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ptba_activities')
    .select('*, logframe_items(intervention_label)')
    .eq('project_id', projectId)
    .eq('fiscal_year', year)
    .order('code', { ascending: true })

  if (error) {
    console.error('Error fetching PTBA:', error)
    throw new Error('Failed to fetch PTBA')
  }

  return data as PtbaActivity[]
}

export async function addPtbaActivity(
  projectId: string,
  data: Omit<PtbaActivity, 'id' | 'project_id' | 'created_at' | 'logframe_items'>
) {
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('ptba_activities')
    .insert([{ project_id: projectId, ...data }])
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

  const { data: item, error } = await supabase
    .from('ptba_activities')
    .update(data)
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
