'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireRole } from './auth.actions'
import { formatCurrency } from '@/lib/utils/format-currency'

export interface EvmBaseline {
  id: string
  project_id: string
  version_number: number
  name: string
  description: string | null
  status: 'DRAFT' | 'APPROVED' | 'SUPERSEDED'
  effective_date: string | null
  approved_at: string | null
  approved_by: string | null
  total_bac: number
  start_date: string | null
  end_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  approver?: {
    full_name: string | null
    email: string | null
  }
}

export interface EvmBaselineItem {
  id: string
  baseline_id: string
  wbs_task_id: string | null
  wbs_code_snapshot: string
  wbs_name_snapshot: string
  planned_start: string
  planned_end: string
  planned_bac: number
  created_at: string
}

export async function getProjectBaselines(projectId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('evm_baselines')
      .select(`
        *,
        approver:approved_by (
          full_name,
          email
        )
      `)
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })

    if (error) throw error
    return { data: (data || []) as EvmBaseline[] }
  } catch (err: any) {
    console.error('Error fetching baselines:', err)
    return { error: err.message, data: [] }
  }
}

export async function getActiveBaseline(projectId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('evm_baselines')
      .select(`
        *,
        approver:approved_by (
          full_name,
          email
        )
      `)
      .eq('project_id', projectId)
      .eq('status', 'APPROVED')
      .maybeSingle()

    if (error) throw error
    return { data: data as EvmBaseline | null }
  } catch (err: any) {
    console.error('Error fetching active baseline:', err)
    return { error: err.message, data: null }
  }
}

/**
 * Sélectionne la baseline applicable à une control_date D donnée :
 * - project_id = projectId
 * - status IN ('APPROVED', 'SUPERSEDED')
 * - effective_date <= controlDate
 * - Tri par effective_date DESC, version_number DESC
 * - Limit 1 avec ses items
 */
export async function getApplicableBaseline(projectId: string, controlDate: string) {
  try {
    const supabase = await createClient()

    const { data: baseline, error } = await supabase
      .from('evm_baselines')
      .select(`
        *,
        approver:approved_by (
          full_name,
          email
        )
      `)
      .eq('project_id', projectId)
      .in('status', ['APPROVED', 'SUPERSEDED'])
      .lte('effective_date', controlDate)
      .order('effective_date', { ascending: false })
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!baseline) return { data: null, items: [] }

    const { data: items, error: itErr } = await supabase
      .from('evm_baseline_items')
      .select('*')
      .eq('baseline_id', baseline.id)
      .order('wbs_code_snapshot', { ascending: true })

    if (itErr) throw itErr

    return {
      data: baseline as EvmBaseline,
      items: (items || []) as EvmBaselineItem[]
    }
  } catch (err: any) {
    console.error('Error fetching applicable baseline:', err)
    return { data: null, items: [], error: err.message }
  }
}

export async function getBaselineWithItems(projectId: string, baselineId: string) {
  try {
    const supabase = await createClient()
    const [baselineRes, itemsRes] = await Promise.all([
      supabase
        .from('evm_baselines')
        .select(`
          *,
          approver:approved_by (
            full_name,
            email
          )
        `)
        .eq('id', baselineId)
        .eq('project_id', projectId)
        .single(),
      supabase
        .from('evm_baseline_items')
        .select('*')
        .eq('baseline_id', baselineId)
        .order('wbs_code_snapshot', { ascending: true })
    ])

    if (baselineRes.error) throw baselineRes.error
    if (itemsRes.error) throw itemsRes.error

    return {
      baseline: baselineRes.data as EvmBaseline,
      items: (itemsRes.data || []) as EvmBaselineItem[]
    }
  } catch (err: any) {
    console.error('Error fetching baseline with items:', err)
    return { error: err.message, baseline: null, items: [] }
  }
}

export async function createDraftBaseline(projectId: string, payload?: { name?: string, description?: string }) {
  try {
    // Only OWNER and PROJECT_MANAGER can create a baseline draft
    await requireRole(projectId, ['OWNER', 'PROJECT_MANAGER'])
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Non authentifié")

    // 1. Get next version number
    const { data: existingBaselines, error: bErr } = await supabase
      .from('evm_baselines')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1)

    if (bErr) throw bErr
    const nextVersion = existingBaselines && existingBaselines.length > 0 ? (existingBaselines[0].version_number + 1) : 1

    // 2. Fetch leaf WBS tasks
    const { data: tasks, error: tErr } = await supabase
      .from('wbs_tasks')
      .select('id, code, name, description, task_type, date_start, date_end')
      .eq('project_id', projectId)
      .neq('task_type', 'SUMMARY')
      .order('sort_order', { ascending: true })

    if (tErr) throw tErr
    if (!tasks || tasks.length === 0) {
      throw new Error("Impossible de créer une baseline : aucune tâche WBS opérationnelle (feuille) n'existe dans ce projet.")
    }

    // Compute dates bounds
    let minStart = tasks[0].date_start
    let maxEnd = tasks[0].date_end
    for (const t of tasks) {
      if (t.date_start && t.date_start < minStart) minStart = t.date_start
      if (t.date_end && t.date_end > maxEnd) maxEnd = t.date_end
    }

    const baselineName = payload?.name?.trim() || `Baseline Contractuelle V${nextVersion}`

    // 3. Insert baseline header (DRAFT)
    const { data: newBaseline, error: insErr } = await supabase
      .from('evm_baselines')
      .insert({
        project_id: projectId,
        version_number: nextVersion,
        name: baselineName,
        description: payload?.description?.trim() || null,
        status: 'DRAFT',
        total_bac: 0,
        start_date: minStart,
        end_date: maxEnd,
        created_by: user.id
      })
      .select()
      .single()

    if (insErr) throw insErr

    // 4. Insert baseline items initialized explicitly to 0
    const itemsToInsert = tasks.map(t => ({
      baseline_id: newBaseline.id,
      wbs_task_id: t.id,
      wbs_code_snapshot: t.code,
      wbs_name_snapshot: t.name || t.description || 'Activité sans nom',
      planned_start: t.date_start,
      planned_end: t.date_end,
      planned_bac: 0
    }))

    const { error: itemsErr } = await supabase
      .from('evm_baseline_items')
      .insert(itemsToInsert)

    if (itemsErr) {
      // Rollback header if items fail
      await supabase.from('evm_baselines').delete().eq('id', newBaseline.id)
      throw itemsErr
    }

    revalidatePath(`/projects/${projectId}/evm`)
    return { success: true, data: newBaseline }
  } catch (err: any) {
    console.error('Error creating draft baseline:', err)
    return { error: err.message || "Erreur lors de la création du brouillon de baseline" }
  }
}

export async function updateDraftBaseline(
  projectId: string,
  baselineId: string,
  payload: {
    name?: string
    description?: string
    effective_date?: string
    items?: { id: string, planned_start: string, planned_end: string, planned_bac: number }[]
  }
) {
  try {
    await requireRole(projectId, ['OWNER', 'PROJECT_MANAGER'])
    const supabase = await createClient()

    // 1. Verify baseline is DRAFT
    const { data: baseline, error: bErr } = await supabase
      .from('evm_baselines')
      .select('id, status')
      .eq('id', baselineId)
      .eq('project_id', projectId)
      .single()

    if (bErr || !baseline) throw new Error("Baseline introuvable")
    if (baseline.status !== 'DRAFT') {
      throw new Error("Seul un brouillon de baseline (DRAFT) peut être modifié.")
    }

    // 2. Update items if provided
    if (payload.items && payload.items.length > 0) {
      for (const item of payload.items) {
        if (new Date(item.planned_start) > new Date(item.planned_end)) {
          throw new Error(`La date de début (${item.planned_start}) ne peut pas être postérieure à la date de fin (${item.planned_end}).`)
        }
        if (Number(item.planned_bac) < 0) {
          throw new Error("Le budget alloué (BAC) d'une tâche ne peut pas être négatif.")
        }

        const { error: itErr } = await supabase
          .from('evm_baseline_items')
          .update({
            planned_start: item.planned_start,
            planned_end: item.planned_end,
            planned_bac: Number(item.planned_bac) || 0
          })
          .eq('id', item.id)
          .eq('baseline_id', baselineId)

        if (itErr) throw itErr
      }
    }

    // 3. Recalculate baseline totals from items
    const { data: currentItems, error: cErr } = await supabase
      .from('evm_baseline_items')
      .select('planned_start, planned_end, planned_bac')
      .eq('baseline_id', baselineId)

    if (cErr) throw cErr

    let totalBac = 0
    let minStart: string | null = null
    let maxEnd: string | null = null

    if (currentItems && currentItems.length > 0) {
      minStart = currentItems[0].planned_start
      maxEnd = currentItems[0].planned_end
      for (const it of currentItems) {
        totalBac += Number(it.planned_bac) || 0
        if (it.planned_start && (!minStart || it.planned_start < minStart)) minStart = it.planned_start
        if (it.planned_end && (!maxEnd || it.planned_end > maxEnd)) maxEnd = it.planned_end
      }
    }

    // 4. Update header
    const updateData: any = {
      total_bac: totalBac,
      start_date: minStart,
      end_date: maxEnd
    }
    if (payload.name !== undefined) updateData.name = payload.name.trim()
    if (payload.description !== undefined) updateData.description = payload.description.trim() || null
    if (payload.effective_date !== undefined) updateData.effective_date = payload.effective_date || null

    const { error: upErr } = await supabase
      .from('evm_baselines')
      .update(updateData)
      .eq('id', baselineId)
      .eq('project_id', projectId)

    if (upErr) throw upErr

    revalidatePath(`/projects/${projectId}/evm`)
    return { success: true }
  } catch (err: any) {
    console.error('Error updating draft baseline:', err)
    return { error: err.message || "Erreur lors de la mise à jour du brouillon" }
  }
}

export async function deleteDraftBaseline(projectId: string, baselineId: string) {
  try {
    await requireRole(projectId, ['OWNER', 'PROJECT_MANAGER'])
    const supabase = await createClient()

    const { data: baseline, error: bErr } = await supabase
      .from('evm_baselines')
      .select('id, status')
      .eq('id', baselineId)
      .eq('project_id', projectId)
      .single()

    if (bErr || !baseline) throw new Error("Baseline introuvable")
    if (baseline.status !== 'DRAFT') {
      throw new Error("Seul un brouillon de baseline (DRAFT) peut être supprimé. Les baselines approuvées sont immutables.")
    }

    const { error: delErr } = await supabase
      .from('evm_baselines')
      .delete()
      .eq('id', baselineId)
      .eq('project_id', projectId)

    if (delErr) throw delErr

    revalidatePath(`/projects/${projectId}/evm`)
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting draft baseline:', err)
    return { error: err.message || "Erreur lors de la suppression du brouillon" }
  }
}

export async function approveBaseline(projectId: string, baselineId: string, effectiveDate: string) {
  try {
    // 1. Strict Role verification (OWNER and PROJECT_MANAGER only)
    await requireRole(projectId, ['OWNER', 'PROJECT_MANAGER'])
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Non authentifié")

    if (!effectiveDate || isNaN(Date.parse(effectiveDate))) {
      throw new Error("Veuillez renseigner une date d'effet contractuelle valide pour l'approbation.")
    }

    // 2. Fetch baseline with items
    const { data: baseline, error: bErr } = await supabase
      .from('evm_baselines')
      .select('*')
      .eq('id', baselineId)
      .eq('project_id', projectId)
      .single()

    if (bErr || !baseline) throw new Error("Baseline introuvable")
    if (baseline.status !== 'DRAFT') {
      throw new Error("Cette baseline n'est plus à l'état de brouillon.")
    }

    const { data: items, error: itErr } = await supabase
      .from('evm_baseline_items')
      .select('*')
      .eq('baseline_id', baselineId)

    if (itErr) throw itErr
    if (!items || items.length === 0) {
      throw new Error("Impossible d'approuver une baseline vide sans tâches.")
    }

    // 3. Check effective_date chronological order against previous baseline
    const { data: prevBaseline } = await supabase
      .from('evm_baselines')
      .select('version_number, effective_date')
      .eq('project_id', projectId)
      .in('status', ['APPROVED', 'SUPERSEDED'])
      .neq('id', baselineId)
      .order('effective_date', { ascending: false })
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (prevBaseline && prevBaseline.effective_date) {
      if (effectiveDate <= prevBaseline.effective_date) {
        throw new Error(`La date d'effet contractuelle (${effectiveDate}) doit être strictement supérieure à celle de la version archivée V${prevBaseline.version_number} (${prevBaseline.effective_date}).`)
      }
    }

    // 4. Check item integrity
    for (const item of items) {
      if (!item.planned_start || !item.planned_end || new Date(item.planned_start) > new Date(item.planned_end)) {
        throw new Error(`La tâche ${item.wbs_code_snapshot} (${item.wbs_name_snapshot}) possède des dates de référence invalides.`)
      }
      if (Number(item.planned_bac) < 0) {
        throw new Error(`La tâche ${item.wbs_code_snapshot} a un montant BAC négatif.`)
      }
    }

    const totalItemBac = items.reduce((sum, it) => sum + (Number(it.planned_bac) || 0), 0)
    if (totalItemBac <= 0) {
      throw new Error("Impossible d'approuver une baseline avec un BAC total nul. Veuillez ventiler les budgets sur les tâches.")
    }

    // 4. Reference budget verification against approved budget lines
    const { data: budgetLines, error: blErr } = await supabase
      .from('budget_lines')
      .select('initial_allocated_amount')
      .eq('project_id', projectId)

    if (blErr) throw blErr

    const referenceBudget = (budgetLines || []).reduce((sum, bl) => sum + (Number(bl.initial_allocated_amount) || 0), 0)

    if (!budgetLines || budgetLines.length === 0 || referenceBudget <= 0) {
      throw new Error("Impossible d'approuver la baseline : aucune ligne budgétaire analytique n'a été créée et approuvée pour ce projet. Veuillez d'abord définir le budget dans le module Budget.")
    }

    const { data: project } = await supabase.from('projects').select('currency').eq('id', projectId).single()
    const currency = project?.currency || 'XOF'

    // Compare totalItemBac to referenceBudget
    const diff = Math.abs(totalItemBac - referenceBudget)
    if (diff > 0.01) {
      const formattedTotal = formatCurrency(totalItemBac, currency)
      const formattedRef = formatCurrency(referenceBudget, currency)
      const formattedDiff = formatCurrency(diff, currency)
      throw new Error(`La somme des budgets de la baseline (${formattedTotal}) ne correspond pas au budget analytique approuvé du projet (${formattedRef}). Écart à équilibrer : ${formattedDiff}.`)
    }

    // 5. Atomic transition: Mark previous APPROVED as SUPERSEDED, and set this one to APPROVED
    const adminClient = createAdminClient()

    // Archive previous approved baseline
    const { error: superErr } = await adminClient
      .from('evm_baselines')
      .update({ status: 'SUPERSEDED' })
      .eq('project_id', projectId)
      .eq('status', 'APPROVED')

    if (superErr) throw superErr

    // Approve new baseline
    const { error: appErr } = await adminClient
      .from('evm_baselines')
      .update({
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        effective_date: effectiveDate,
        total_bac: totalItemBac
      })
      .eq('id', baselineId)
      .eq('project_id', projectId)

    if (appErr) throw appErr

    revalidatePath(`/projects/${projectId}/evm`)
    return { success: true }
  } catch (err: any) {
    console.error('Error approving baseline:', err)
    return { error: err.message || "Erreur lors de l'approbation de la baseline" }
  }
}
