'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateEvmDate(projectId: string, date: string) {
  const supabase = await createClient()

  // On Supabase, this will be protected by RLS (only owner/chef_projet can update projects)
  const { error } = await supabase
    .from('projects')
    .update({ evm_control_date: date })
    .eq('id', projectId)

  if (error) {
    console.error('Failed to update EVM date:', error)
    throw new Error('Failed to update EVM date')
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects`)
}
