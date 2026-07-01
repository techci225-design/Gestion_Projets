'use server'

import { z } from 'zod'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'

const riskSchema = z.object({
  project_id: z.string().uuid(),
  category: z.string().min(1),
  description: z.string().min(1),
  probability: z.number().int().min(1).max(3),
  impact: z.number().int().min(1).max(3),
  mitigation_strategy: z.string().optional(),
  responsible: z.string().optional(),
  status: z.enum(['ouvert', 'en_cours', 'clos']).default('ouvert')
})

export async function createRisk(data: z.infer<typeof riskSchema>) {
  const parsed = riskSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid data', details: parsed.error.issues }

  const supabase = await createClient()
  const { data: result, error } = await supabase.from('risks').insert(parsed.data).select().single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${parsed.data.project_id}/risques`)
  return { data: result }
}
