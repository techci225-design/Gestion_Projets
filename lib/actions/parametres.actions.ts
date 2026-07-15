'use server'

import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from './auth.actions'
import { z } from 'zod'

const fundingSourceSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1, "Le nom du bailleur est requis"),
  type: z.enum(['bailleur', 'contrepartie', 'autre']).default('bailleur'),
  amount_committed: z.number().min(0, "Le montant doit être positif")
})

export async function addFundingSource(data: z.infer<typeof fundingSourceSchema>) {
  const parsed = fundingSourceSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Données invalides', details: parsed.error.issues }
  }

  try {
    await requireRole(parsed.data.project_id, ['owner', 'comptable'])
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('funding_sources')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${parsed.data.project_id}/parametres`)
  revalidatePath(`/projects/${parsed.data.project_id}/budget`)
  return { data: result }
}

export async function deleteFundingSource(projectId: string, id: string) {
  try {
    await requireRole(projectId, ['owner', 'comptable'])
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('funding_sources')
    .delete()
    .eq('id', id)
    .eq('project_id', projectId) // Extra security

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}/parametres`)
  revalidatePath(`/projects/${projectId}/budget`)
  return { success: true }
}
