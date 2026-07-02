'use server'

import { z } from 'zod'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from './auth.actions'

const ptbaSchema = z.object({
  project_id: z.string().uuid(),
  logframe_item_id: z.string().uuid().optional(),
  code: z.string().min(1),
  title: z.string().min(1),
  responsible: z.string().optional(),
  fiscal_year: z.number().int().min(2000).optional(),
  q1: z.boolean().default(false),
  q2: z.boolean().default(false),
  q3: z.boolean().default(false),
  q4: z.boolean().default(false),
  planned_budget: z.number().min(0).default(0)
})

export async function createPtbaActivity(data: z.infer<typeof ptbaSchema>) {
  const parsed = ptbaSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid data', details: parsed.error.issues }

  try {
    await requireRole(parsed.data.project_id, ['owner', 'chef_projet'])
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()
  const { data: result, error } = await supabase.from('ptba_activities').insert(parsed.data).select().single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${parsed.data.project_id}/ptba`)
  return { data: result }
}
