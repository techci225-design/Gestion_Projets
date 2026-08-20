'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

import { 
  calculateProjectBAC, calculateProjectPV, calculateProjectEV, calculateProjectAC, calculateIndicators,
  WbsTask, PtbaActivity, OperationJournal
} from '@/lib/utils/evm'

export async function createEvmSnapshot(projectId: string, payload: { control_date: string }, overwrite: boolean = false) {
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

  if (!member || !['OWNER', 'PROJECT_MANAGER'].includes(member.role)) {
    return { error: 'Permissions insuffisantes pour créer un arrêté EVM' }
  }

  // RECALCULATE ON THE SERVER
  const statusDateStr = payload.control_date

  const { data: wbsTasksData } = await supabase
    .from('wbs_tasks')
    .select('id, parent_id, task_type, code, description, responsible_user_id, responsible, date_start, date_end, percent_complete')
    .eq('project_id', projectId)

  const { data: ptbaActivitiesData } = await supabase
    .from('ptba_activities')
    .select('wbs_task_id, fiscal_year, budget_planned')
    .in('wbs_task_id', (wbsTasksData || []).map(t => t.id))

  const { data: journalData } = await supabase
    .from('operations_journal')
    .select('wbs_task_id, status, actual_cost, operation_date')
    .in('wbs_task_id', (wbsTasksData || []).map(t => t.id))

  const wbsTasks = (wbsTasksData || []) as WbsTask[]
  const ptbaActivities = (ptbaActivitiesData || []) as PtbaActivity[]
  const operations = (journalData || []) as OperationJournal[]

  const pBAC = calculateProjectBAC(wbsTasks, ptbaActivities)
  const pPV = calculateProjectPV(statusDateStr, wbsTasks, ptbaActivities).pv
  const pEV = calculateProjectEV(wbsTasks, ptbaActivities)
  const pAC = calculateProjectAC(statusDateStr, wbsTasks, operations)
  const pInd = calculateIndicators(pBAC, pPV, pEV, pAC)

  const adminClient = createAdminClient()
  
  const snapshotDataToSave = {
    project_id: projectId,
    control_date: statusDateStr,
    bac_total: pBAC,
    pv_total: pPV,
    ev_total: pEV,
    ac_total: pAC,
    cpi_global: pInd.cpi,
    spi_global: pInd.spi,
    eac_global: pInd.eac,
    created_by: user.id
  }

  if (overwrite) {
    const { error } = await adminClient
      .from('evm_snapshots')
      .upsert(snapshotDataToSave, { onConflict: 'project_id, control_date' })

    if (error) return { error: error.message }
  } else {
    const { error } = await adminClient
      .from('evm_snapshots')
      .insert(snapshotDataToSave)

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
