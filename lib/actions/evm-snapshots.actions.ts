'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createEvmSnapshot(projectId: string, snapshotData: any, overwrite: boolean = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Check role
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'chef_projet'].includes(member.role)) {
    return { error: 'Permissions insuffisantes pour créer un arrêté EVM' }
  }

  // Utiliser adminClient au cas où la RLS d'insert manque sur evm_snapshots
  const adminClient = createAdminClient()
  
  if (overwrite) {
    const { error } = await adminClient
      .from('evm_snapshots')
      .upsert({
        project_id: projectId,
        control_date: snapshotData.control_date,
        bac_total: snapshotData.bac_total,
        pv_total: snapshotData.pv_total,
        ev_total: snapshotData.ev_total,
        ac_total: snapshotData.ac_total,
        cpi_global: snapshotData.cpi_global,
        spi_global: snapshotData.spi_global,
        eac_global: snapshotData.eac_global,
        created_by: user.id
      }, { onConflict: 'project_id, control_date' })

    if (error) return { error: error.message }
  } else {
    const { error } = await adminClient
      .from('evm_snapshots')
      .insert({
        project_id: projectId,
        control_date: snapshotData.control_date,
        bac_total: snapshotData.bac_total,
        pv_total: snapshotData.pv_total,
        ev_total: snapshotData.ev_total,
        ac_total: snapshotData.ac_total,
        cpi_global: snapshotData.cpi_global,
        spi_global: snapshotData.spi_global,
        eac_global: snapshotData.eac_global,
        created_by: user.id
      })

    if (error) {
      if (error.code === '23505') {
        return { error: 'Un arrêté existe déjà pour cette date', code: 'CONFLICT' }
      }
      return { error: error.message }
    }
  }

  revalidatePath(`/projects/${projectId}/evm`)
  return { success: true }
}

export async function getEvmSnapshots(projectId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('evm_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('control_date', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function deleteEvmSnapshot(projectId: string, snapshotId: string) {
  const supabase = await createClient()
  
  // RLS will check role, but let's be safe
  const { error } = await supabase
    .from('evm_snapshots')
    .delete()
    .eq('id', snapshotId)
    .eq('project_id', projectId)

  if (error) return { error: error.message }
  
  revalidatePath(`/projects/${projectId}/evm`)
  return { success: true }
}

export async function updateEvmSnapshotNotes(projectId: string, snapshotId: string, notes: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('evm_snapshots')
    .update({ notes })
    .eq('id', snapshotId)
    .eq('project_id', projectId)

  if (error) return { error: error.message }
  
  revalidatePath(`/projects/${projectId}/evm`)
  return { success: true }
}
