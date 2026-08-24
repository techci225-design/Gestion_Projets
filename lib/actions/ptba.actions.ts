'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { LogframeItem } from './logframe.actions'
import { hasProjectPermission, ProjectRole } from '../permissions/project-permissions'
import { z } from 'zod'

export interface PtbaActivity {
  id: string
  project_id: string
  wbs_task_id?: string | null
  budget_line_id?: string | null
  logframe_item_id: string | null
  code?: string
  description?: string
  responsible?: string | null
  fiscal_year: number
  q1: boolean
  q2: boolean
  q3: boolean
  q4: boolean
  budget_planned: number
  created_at: string
  wbs_tasks?: {
    code: string
    name: string
    responsible_user_id: string | null
    date_start: string
    date_end: string
  }
  budget_lines?: {
    code: string
    label: string
  }
  logframe_items?: Pick<LogframeItem, 'intervention_label'>
}

const PtbaActivitySchema = z.object({
  wbs_task_id: z.string().uuid(),
  budget_line_id: z.string().uuid().nullable().optional(),
  fiscal_year: z.number().int().min(2000).max(2100),
  q1: z.boolean(),
  q2: z.boolean(),
  q3: z.boolean(),
  q4: z.boolean(),
  budget_planned: z.number().min(0).default(0)
})

async function requirePermission(projectId: string, action: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non autorisé")

  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  const userRole = member?.role
  if (!userRole) throw new Error("Accès refusé")

  // On aligne les permissions avec view_tasks / edit_tasks ou edit_budget
  const mappedAction: any = action === 'edit' ? 'edit_tasks' : 'view_tasks'
  
  if (!hasProjectPermission(userRole as ProjectRole, mappedAction)) {
    throw new Error("Permissions insuffisantes")
  }
  return { user, userRole }
}

export async function getPtbaActivities(projectId: string, year: number) {
  try {
    await requirePermission(projectId, 'view')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('ptba_activities')
      .select(`
        *,
        logframe_items(intervention_label),
        wbs_tasks(code, name, date_start, date_end, responsible_user_id),
        budget_lines(code, label)
      `)
      .eq('project_id', projectId)
      .eq('fiscal_year', year)
      // On filtre uniquement ceux qui sont liés au WBS pour le nouveau PTBA
      .not('wbs_task_id', 'is', null)

    if (error) {
      console.error('Error fetching PTBA:', error)
      throw new Error('Failed to fetch PTBA')
    }

    // Sort by WBS Code
    const sortedData = (data as any[]).sort((a, b) => {
      const codeA = a.wbs_tasks?.code || ''
      const codeB = b.wbs_tasks?.code || ''
      const aParts = codeA.split('.').map(Number)
      const bParts = codeB.split('.').map(Number)
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        if (aParts[i] === undefined) return -1
        if (bParts[i] === undefined) return 1
        if (aParts[i] !== bParts[i]) return (aParts[i] || 0) - (bParts[i] || 0)
      }
      return 0
    })

    return sortedData as PtbaActivity[]
  } catch (err: any) {
    console.error(err)
    return []
  }
}

import { formatCurrency } from '@/lib/utils/format-currency'

/**
 * Helper: Vérifie que la programmation PTBA ne dépasse pas l'enveloppe allouée de la ligne budgétaire.
 * Règle métier : SUM(ptba_activities.budget_planned) <= budget_lines.initial_allocated_amount (tous exercices confondus).
 */
async function validatePtbaBudgetEnvelope(
  supabase: any,
  projectId: string,
  budgetLineId: string | null | undefined,
  budgetPlanned: number,
  excludePtbaActivityId?: string
) {
  if (!budgetLineId) return // Aucune ligne budgétaire rattachée, pas de plafond de ligne à contrôler

  // 1. Récupérer la ligne budgétaire
  const { data: bLine, error: bErr } = await supabase
    .from('budget_lines')
    .select('id, code, label, initial_allocated_amount')
    .eq('id', budgetLineId)
    .eq('project_id', projectId)
    .single()

  if (bErr || !bLine) {
    throw new Error("Ligne budgétaire introuvable dans ce projet")
  }

  // 2. Récupérer la somme des programmations PTBA existantes pour cette ligne (toutes années confondues)
  let query = supabase
    .from('ptba_activities')
    .select('budget_planned')
    .eq('project_id', projectId)
    .eq('budget_line_id', budgetLineId)

  if (excludePtbaActivityId) {
    query = query.neq('id', excludePtbaActivityId)
  }

  const { data: otherPtba, error: ptbaErr } = await query
  if (ptbaErr) {
    throw new Error("Erreur lors de la vérification de l'enveloppe budgétaire")
  }

  const alreadyPlanned = (otherPtba || []).reduce(
    (sum: number, item: any) => sum + (Number(item.budget_planned) || 0),
    0
  )
  const lineBudget = Number(bLine.initial_allocated_amount) || 0
  const available = Math.max(0, lineBudget - alreadyPlanned)
  const requested = Number(budgetPlanned) || 0

  if (requested > available) {
    // Récupérer la devise du projet pour formater le message d'erreur utilisateur
    const { data: project } = await supabase
      .from('projects')
      .select('currency')
      .eq('id', projectId)
      .single()

    const currency = project?.currency || 'XOF'
    const availableFormatted = formatCurrency(available, currency)
    const requestedFormatted = formatCurrency(requested, currency)
    const lineLabel = bLine.code ? `${bLine.code} - ${bLine.label}` : bLine.label

    throw new Error(
      `Cette programmation dépasse l'enveloppe disponible de la ligne budgétaire (${lineLabel}). Disponible : ${availableFormatted}. Montant demandé : ${requestedFormatted}.`
    )
  }
}

export async function getBudgetLinesWithPtbaSummary(projectId: string) {
  try {
    await requirePermission(projectId, 'view')
    const supabase = await createClient()

    const [budgetLinesRes, ptbaRes] = await Promise.all([
      supabase
        .from('budget_lines')
        .select('id, code, label, initial_allocated_amount')
        .eq('project_id', projectId)
        .order('code', { ascending: true }),
      supabase
        .from('ptba_activities')
        .select('id, budget_line_id, budget_planned')
        .eq('project_id', projectId)
        .not('budget_line_id', 'is', null)
    ])

    if (budgetLinesRes.error) throw budgetLinesRes.error

    const ptbaByLine = (ptbaRes.data || []).reduce((acc: Record<string, number>, item: any) => {
      if (item.budget_line_id) {
        acc[item.budget_line_id] = (acc[item.budget_line_id] || 0) + (Number(item.budget_planned) || 0)
      }
      return acc
    }, {})

    return (budgetLinesRes.data || []).map((bl: any) => {
      const initialAllocated = Number(bl.initial_allocated_amount) || 0
      const totalProgrammed = ptbaByLine[bl.id] || 0
      const availableToProgram = Math.max(0, initialAllocated - totalProgrammed)
      return {
        ...bl,
        initial_allocated_amount: initialAllocated,
        total_programmed: totalProgrammed,
        available_to_program: availableToProgram
      }
    })
  } catch (err: any) {
    console.error('Error fetching budget lines summary:', err)
    return []
  }
}

export async function addPtbaActivity(projectId: string, data: any) {
  try {
    await requirePermission(projectId, 'edit')
    
    // Ensure empty string is null for UUIDs
    if (data.budget_line_id === '') data.budget_line_id = null

    const validatedData = PtbaActivitySchema.parse(data)
    const supabase = await createClient()

    // 1. Verify WBS Task exists and belongs to project
    const { data: task, error: taskErr } = await supabase
      .from('wbs_tasks')
      .select('id')
      .eq('id', validatedData.wbs_task_id)
      .eq('project_id', projectId)
      .single()

    if (taskErr || !task) throw new Error("Tâche WBS introuvable dans ce projet")

    // 2. Validate Budget Line envelope if provided
    await validatePtbaBudgetEnvelope(
      supabase,
      projectId,
      validatedData.budget_line_id,
      validatedData.budget_planned
    )

    // 3. Insert into PTBA
    const { data: item, error } = await supabase
      .from('ptba_activities')
      .insert([{ 
        project_id: projectId, 
        wbs_task_id: validatedData.wbs_task_id,
        budget_line_id: validatedData.budget_line_id,
        fiscal_year: validatedData.fiscal_year,
        q1: validatedData.q1,
        q2: validatedData.q2,
        q3: validatedData.q3,
        q4: validatedData.q4,
        budget_planned: validatedData.budget_planned,
        // Fill legacy text fields with placeholder to satisfy NOT NULL constraints if they exist
        code: 'SYNC',
        description: 'SYNC'
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new Error("Cette activité WBS est déjà programmée pour cette année fiscale.")
      throw error
    }

    revalidatePath(`/projects/${projectId}/ptba`)
    return { success: true, data: item }
  } catch (err: any) {
    console.error('Error adding PTBA activity:', err)
    return { error: err.message || "Erreur lors de l'ajout" }
  }
}

export async function updatePtbaActivity(projectId: string, id: string, data: any) {
  try {
    await requirePermission(projectId, 'edit')
    
    if (data.budget_line_id === '') data.budget_line_id = null
    const validatedData = PtbaActivitySchema.partial().parse(data)
    const supabase = await createClient()

    // 1. Fetch current activity to get current values for partial updates
    const { data: currentActivity, error: fetchErr } = await supabase
      .from('ptba_activities')
      .select('id, budget_line_id, budget_planned')
      .eq('id', id)
      .eq('project_id', projectId)
      .single()

    if (fetchErr || !currentActivity) {
      throw new Error("Activité PTBA introuvable dans ce projet")
    }

    // 2. Determine target budget_line_id and target budget_planned
    const targetBudgetLineId = validatedData.budget_line_id !== undefined 
      ? validatedData.budget_line_id 
      : currentActivity.budget_line_id

    const targetBudgetPlanned = validatedData.budget_planned !== undefined 
      ? Number(validatedData.budget_planned) 
      : Number(currentActivity.budget_planned)

    // 3. Validate Budget Line envelope if target budget_line_id is set
    await validatePtbaBudgetEnvelope(
      supabase,
      projectId,
      targetBudgetLineId,
      targetBudgetPlanned,
      id // exclude current activity from sum
    )

    const { data: item, error } = await supabase
      .from('ptba_activities')
      .update({
        budget_line_id: validatedData.budget_line_id,
        q1: validatedData.q1,
        q2: validatedData.q2,
        q3: validatedData.q3,
        q4: validatedData.q4,
        budget_planned: validatedData.budget_planned
      })
      .eq('id', id)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/projects/${projectId}/ptba`)
    return { success: true, data: item }
  } catch (err: any) {
    console.error('Error updating PTBA activity:', err)
    return { error: err.message || "Erreur lors de la mise à jour" }
  }
}

export async function deletePtbaActivity(projectId: string, id: string) {
  try {
    await requirePermission(projectId, 'edit')
    const supabase = await createClient()

    const { error } = await supabase
      .from('ptba_activities')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId)

    if (error) throw error

    revalidatePath(`/projects/${projectId}/ptba`)
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting PTBA activity:', err)
    return { error: err.message || "Erreur lors de la suppression" }
  }
}
