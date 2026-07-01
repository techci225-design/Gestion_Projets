'use server'

import { z } from 'zod'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'

const procurementSchema = z.object({
  project_id: z.string().uuid(),
  description: z.string().min(1),
  market_type: z.string().optional(),
  method: z.string().optional(),
  review_type: z.enum(['a_priori', 'a_posteriori']).optional(),
  planned_notice_date: z.string().optional(),
  contract_signature_date: z.string().optional(),
  estimated_amount: z.number().min(0).optional(),
  status: z.string().default('planifie')
})

export async function createProcurement(data: z.infer<typeof procurementSchema>) {
  const parsed = procurementSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid data', details: parsed.error.issues }

  const supabase = await createClient()
  const { data: result, error } = await supabase.from('procurement_plan').insert(parsed.data).select().single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${parsed.data.project_id}/marches`)
  return { data: result }
}
