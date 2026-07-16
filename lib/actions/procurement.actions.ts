'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ProcurementItem {
  id: string
  project_id: string
  description: string
  market_type: string | null
  method: string | null
  review_type: 'a_priori' | 'a_posteriori' | null
  planned_notice_date: string | null
  contract_signature_date: string | null
  estimated_amount: number | null
  status: string
  created_at: string
}

export async function getProcurementPlan(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('procurement_plan')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching procurement plan:', error)
    throw new Error('Failed to fetch procurement plan')
  }

  return data as ProcurementItem[]
}

export async function addProcurement(
  projectId: string,
  data: Omit<ProcurementItem, 'id' | 'project_id' | 'created_at'>
) {
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('procurement_plan')
    .insert([{ project_id: projectId, ...data }])
    .select()
    .single()

  if (error) {
    console.error('Error adding procurement item:', error)
    throw new Error('Failed to add procurement item')
  }

  revalidatePath(`/projects/${projectId}/marches`)
  return item as ProcurementItem
}

export async function updateProcurement(
  projectId: string,
  id: string,
  data: Partial<Omit<ProcurementItem, 'id' | 'project_id' | 'created_at'>>
) {
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('procurement_plan')
    .update(data)
    .eq('id', id)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) {
    console.error('Error updating procurement item:', error)
    throw new Error('Failed to update procurement item')
  }

  revalidatePath(`/projects/${projectId}/marches`)
  return item as ProcurementItem
}

export async function deleteProcurement(projectId: string, id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('procurement_plan')
    .delete()
    .eq('id', id)
    .eq('project_id', projectId)

  if (error) {
    console.error('Error deleting procurement item:', error)
    throw new Error('Failed to delete procurement item')
  }

  revalidatePath(`/projects/${projectId}/marches`)
}
