'use server'

import { z } from 'zod'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from './auth.actions'

const memberSchema = z.object({
  project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'chef_projet', 'comptable', 'bailleur_lecture', 'consultant'])
})

export async function addMember(data: z.infer<typeof memberSchema>) {
  const parsed = memberSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid data', details: parsed.error.issues }

  try {
    await requireRole(parsed.data.project_id, ['owner'])
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()
  const { data: result, error } = await supabase.from('project_members').insert(parsed.data).select().single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${parsed.data.project_id}/membres`)
  return { data: result }
}
