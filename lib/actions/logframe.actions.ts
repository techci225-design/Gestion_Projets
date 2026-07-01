'use server'

import { z } from 'zod'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'

const logframeSchema = z.object({
  project_id: z.string().uuid(),
  parent_id: z.string().uuid().optional(),
  level: z.enum(['objectif_global', 'objectif_specifique', 'resultat', 'activite']),
  intervention_label: z.string().min(1),
  indicator: z.string().optional(),
  baseline: z.string().optional(),
  target: z.string().optional(),
  verification_source: z.string().optional(),
  risks_assumptions: z.string().optional()
})

export async function createLogframeItem(data: z.infer<typeof logframeSchema>) {
  const parsed = logframeSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid data', details: parsed.error.issues }

  const supabase = await createClient()
  const { data: result, error } = await supabase.from('logframe_items').insert(parsed.data).select().single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${parsed.data.project_id}/cadre-logique`)
  return { data: result }
}
