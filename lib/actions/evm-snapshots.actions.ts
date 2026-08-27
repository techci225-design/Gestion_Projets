'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { 
  calculateProjectBAC, calculateProjectPV, calculateProjectEV, calculateProjectAC, calculateIndicators,
  calculateBaselineProjectPV, calculateBaselineProjectEV, calculateBaselineProjectAC,
  WbsTask, PtbaActivity, OperationJournal
} from '@/lib/utils/evm'
import { getApplicableBaseline } from './baseline.actions'
import { requireProjectPermission, requireRole } from './auth.actions'

const evmSnapshotSchema = z.object({
  projectId: z.string().uuid(),
  control_date: z.string().date(),
})

const evmSnapshotNotesSchema = z.object({
  projectId: z.string().uuid(),
  snapshotId: z.string().uuid(),
  notes: z.string().trim().max(2_000),
})

export async function createEvmSnapshot(projectId: string, payload: { control_date: string }) {
  const parsed = evmSnapshotSchema.safeParse({ projectId, ...payload })
  if (!parsed.success) return { error: 'Données d’arrêté EVM invalides.' }

  try {
    await requireRole(parsed.data.projectId, ['OWNER', 'PROJECT_MANAGER'])
  } catch (error: any) {
    return { error: error.message }
  }

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

  // 1. RECALCULATE ON THE SERVER & VALIDATE TEMPORAL INTEGRITY
  const statusDateStr = parsed.data.control_date
  const todayStr = new Date().toISOString().split('T')[0]

  // Règle Date Future : Refus d'enregistrer un arrêté officiel pour une date future
  if (statusDateStr > todayStr) {
    return {
      error: "Impossible d'enregistrer un arrêté officiel pour une date future.",
      code: 'INVALID_FUTURE_CONTROL_DATE'
    }
  }

  const adminClient = createAdminClient()

  // Vérifier si un arrêté officiel existe déjà pour cette date (Immutabilité stricte)
  const { data: existingSnapshot } = await adminClient
    .from('evm_snapshots')
    .select('id, control_date, baseline_id')
    .eq('project_id', projectId)
    .eq('control_date', statusDateStr)
    .maybeSingle()

  if (existingSnapshot) {
    return {
      error: "Un arrêté officiel existe déjà pour cette date et ses métriques sont strictement immuables.",
      code: 'SNAPSHOT_ALREADY_EXISTS'
    }
  }

  // Règle Date Passée : Refuser la création d'un NOUVEL arrêté rétroactif non certifiable (BASELINE & LEGACY)
  if (statusDateStr < todayStr) {
    return {
      error: "Impossible d'enregistrer cet arrêté comme officiel : l'avancement physique historique à cette date n'est pas disponible de manière certifiable.",
      code: 'UNCERTIFIED_HISTORICAL_PROGRESS'
    }
  }

  const [
    { data: wbsTasksData },
    { data: ptbaActivitiesData },
    { data: journalData },
    { data: disbursementsData },
    applicableBaselineRes
  ] = await Promise.all([
    supabase
      .from('wbs_tasks')
      .select('id, parent_id, task_type, code, description, responsible_user_id, responsible, date_start, date_end, percent_complete')
      .eq('project_id', projectId),
    supabase
      .from('ptba_activities')
      .select('wbs_task_id, fiscal_year, budget_planned')
      .eq('project_id', projectId),
    supabase
      .from('operations_journal')
      .select('id, wbs_task_id, status, actual_cost, operation_date')
      .eq('project_id', projectId),
    supabase
      .from('operation_disbursements')
      .select('id, operation_id, project_id, disbursement_date, amount')
      .eq('project_id', projectId),
    getApplicableBaseline(projectId, statusDateStr)
  ])

  const wbsTasks = (wbsTasksData || []) as WbsTask[]
  const ptbaActivities = (ptbaActivitiesData || []) as PtbaActivity[]
  const operations = (journalData || []) as OperationJournal[]
  const disbursements = (disbursementsData || []) as any[]

  let pBAC = 0
  let pPV = 0
  let pEV = 0
  let pAC = 0
  let baselineId: string | null = null

  if (applicableBaselineRes.data && applicableBaselineRes.items.length > 0) {
    // Mode BASELINE
    const items = applicableBaselineRes.items
    pBAC = items.reduce((sum, it) => sum + (Number(it.planned_bac) || 0), 0)
    pPV = calculateBaselineProjectPV(statusDateStr, items).pv
    pEV = calculateBaselineProjectEV(items, wbsTasks).ev
    const acRes = calculateBaselineProjectAC(statusDateStr, items, operations, disbursements)
    pAC = acRes.ac_total
    baselineId = applicableBaselineRes.data.id
  } else {
    // Mode LEGACY
    pBAC = calculateProjectBAC(wbsTasks, ptbaActivities)
    pPV = calculateProjectPV(statusDateStr, wbsTasks, ptbaActivities).pv
    pEV = calculateProjectEV(wbsTasks, ptbaActivities)
    pAC = calculateProjectAC(statusDateStr, wbsTasks, operations, disbursements)
    baselineId = null
  }

  const pInd = calculateIndicators(pBAC, pPV, pEV, pAC)
  
  const snapshotDataToSave: any = {
    project_id: projectId,
    control_date: statusDateStr,
    bac_total: pBAC,
    pv_total: pPV,
    ev_total: pEV,
    ac_total: pAC,
    cpi_global: pInd.cpi,
    spi_global: pInd.spi,
    eac_global: pInd.eac,
    baseline_id: baselineId,
    created_by: user.id
  }

  const { error } = await adminClient
    .from('evm_snapshots')
    .insert(snapshotDataToSave)

  if (error) {
    if (error.code === '23505') {
      return { 
        error: "Un arrêté officiel existe déjà pour cette date et ses métriques sont strictement immuables.", 
        code: 'SNAPSHOT_ALREADY_EXISTS' 
      }
    }
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}/evm`)
  return { success: true }
}

export async function getEvmSnapshots(projectId: string) {
  const parsed = z.string().uuid().safeParse(projectId)
  if (!parsed.success) return { data: null, error: 'Projet invalide.' }

  try {
    await requireProjectPermission(parsed.data, 'view_reports')
  } catch (error: any) {
    return { data: null, error: error.message }
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('evm_snapshots')
    .select(`
      *,
      baseline:baseline_id (
        version_number,
        name
      )
    `)
    .eq('project_id', parsed.data)
    .order('control_date', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/** Official snapshots are immutable records and must never be deleted. */
export async function deleteEvmSnapshot(projectId: string, snapshotId: string) {
  const parsed = z.object({
    projectId: z.string().uuid(),
    snapshotId: z.string().uuid(),
  }).safeParse({ projectId, snapshotId })

  if (!parsed.success) return { error: 'Identifiants d’arrêté EVM invalides.' }
  return { error: 'Un arrêté officiel EVM ne peut pas être supprimé.' }
}

export async function updateEvmSnapshotNotes(projectId: string, snapshotId: string, notes: string) {
  const parsed = evmSnapshotNotesSchema.safeParse({ projectId, snapshotId, notes })
  if (!parsed.success) return { error: 'Notes ou identifiants invalides.' }

  try {
    await requireRole(parsed.data.projectId, ['OWNER', 'PROJECT_MANAGER'])
  } catch (error: any) {
    return { error: error.message }
  }

  const adminClient = createAdminClient()
  
  const { error } = await adminClient
    .from('evm_snapshots')
    .update({ notes: parsed.data.notes })
    .eq('id', parsed.data.snapshotId)
    .eq('project_id', parsed.data.projectId)

  if (error) return { error: error.message }
  
  revalidatePath(`/projects/${parsed.data.projectId}/evm`)
  return { success: true }
}
