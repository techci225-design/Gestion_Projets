'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface RiskItem {
  id: string
  project_id: string
  category: string
  description: string
  probability: number
  impact: number
  criticality: number
  mitigation_strategy: string | null
  responsible: string | null
  status: 'ouvert' | 'en_cours' | 'clos'
  created_at: string
}

export async function getRisks(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('risks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching risks:', error)
    throw new Error('Failed to fetch risks')
  }

  return data as RiskItem[]
}

export async function addRisk(
  projectId: string,
  data: Omit<RiskItem, 'id' | 'project_id' | 'criticality' | 'created_at'>
) {
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('risks')
    .insert([{ project_id: projectId, ...data }])
    .select()
    .single()

  if (error) {
    console.error('Error adding risk:', error)
    throw new Error('Failed to add risk')
  }

  revalidatePath(`/projects/${projectId}/risques`)
  return item as RiskItem
}

export async function updateRisk(
  projectId: string,
  id: string,
  data: Partial<Omit<RiskItem, 'id' | 'project_id' | 'criticality' | 'created_at'>>
) {
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('risks')
    .update(data)
    .eq('id', id)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) {
    console.error('Error updating risk:', error)
    throw new Error('Failed to update risk')
  }

  revalidatePath(`/projects/${projectId}/risques`)
  return item as RiskItem
}

export async function deleteRisk(projectId: string, id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('risks')
    .delete()
    .eq('id', id)
    .eq('project_id', projectId)

  if (error) {
    console.error('Error deleting risk:', error)
    throw new Error('Failed to delete risk')
  }

  revalidatePath(`/projects/${projectId}/risques`)
}
