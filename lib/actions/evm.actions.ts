'use server'

import { z } from 'zod'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'

const evmTaskSchema = z.object({
  project_id: z.string().uuid(),
  code: z.string().min(1),
  description: z.string().min(1),
  responsible: z.string().optional(),
  date_start: z.string(), // YYYY-MM-DD
  date_end: z.string(),
  budget_allocated: z.number().min(0),
  percent_complete: z.number().min(0).max(100),
  actual_cost: z.number().min(0)
})

export async function createEvmTask(data: z.infer<typeof evmTaskSchema>) {
  const parsed = evmTaskSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid data', details: parsed.error.issues }

  const supabase = await createClient()
  const { data: result, error } = await supabase.from('wbs_tasks').insert(parsed.data).select().single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${parsed.data.project_id}/evm`)
  return { data: result }
}
