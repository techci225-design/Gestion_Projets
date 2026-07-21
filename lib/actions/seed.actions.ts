'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function seedDemoProject(organizationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const adminClient = createAdminClient()

  // 1. Create Project
  const { data: project, error: projectError } = await adminClient
    .from('projects')
    .insert({
      organization_id: organizationId,
      name: "Projet de Réhabilitation des Infrastructures Rurales",
      code: "DEMO-2026",
      description: "Projet pilote financé par la BAD visant à réhabiliter les infrastructures d'eau potable dans 3 régions.",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      status: "actif",
      evm_control_date: "2026-06-30"
    })
    .select()
    .single()

  if (projectError || !project) {
    console.error('Demo project creation error:', projectError)
    return { error: 'Erreur lors de la création du projet de démonstration.' }
  }

  const projectId = project.id

  // Add the user as owner of the project to satisfy RLS for subsequent inserts
  const { error: memberError } = await adminClient.from('project_members').insert({
    project_id: projectId,
    user_id: user.id,
    role: 'owner'
  })

  if (memberError) {
    console.error('Demo project member error:', memberError)
    return { error: 'Erreur lors de la création du membre du projet.' }
  }

  // 2. Add Funding Sources
  const { data: badSource, error: badError } = await adminClient
    .from('funding_sources')
    .insert({
      project_id: projectId,
      name: "Banque Africaine de Développement (BAD)",
      type: "bailleur",
      amount_committed: 80000000
    })
    .select()
    .single()

  const { data: etatSource, error: etatError } = await adminClient
    .from('funding_sources')
    .insert({
      project_id: projectId,
      name: "Contrepartie État",
      type: "contrepartie",
      amount_committed: 20000000
    })
    .select()
    .single()

  if (badError || etatError) return { error: 'Erreur sources financement' }

  // 3. Add Budget Lines
  const budgetLinesData = [
    { code: "1.1", label: "Études et conception", initial_allocated_amount: 8000000, funding_source_id: badSource.id, project_id: projectId },
    { code: "1.2", label: "Travaux de génie civil", initial_allocated_amount: 45000000, funding_source_id: badSource.id, project_id: projectId },
    { code: "1.3", label: "Équipements hydrauliques", initial_allocated_amount: 18000000, funding_source_id: badSource.id, project_id: projectId },
    { code: "1.4", label: "Renforcement des capacités", initial_allocated_amount: 9000000, funding_source_id: badSource.id, project_id: projectId },
    { code: "2.1", label: "Fonctionnement et mission", initial_allocated_amount: 12000000, funding_source_id: etatSource.id, project_id: projectId },
    { code: "2.2", label: "Audit et évaluation", initial_allocated_amount: 8000000, funding_source_id: etatSource.id, project_id: projectId }
  ]

  const { data: budgetLines, error: blError } = await adminClient
    .from('budget_lines')
    .insert(budgetLinesData)
    .select()

  if (blError || !budgetLines) return { error: 'Erreur lignes budgétaires' }

  const blMap = budgetLines.reduce((acc, bl) => ({ ...acc, [bl.code]: bl.id }), {} as Record<string, string>)

  // 4. Add Operations Journal
  const operationsData = [
    { project_id: projectId, task_code: "T-001", phase_wbs: "Études préliminaires (Acompte)", budget_line_id: blMap["1.1"], status: "decaisse", planned_cost: 8000000, actual_cost: 7800000 },
    { project_id: projectId, task_code: "T-002", phase_wbs: "Avance de démarrage", budget_line_id: blMap["1.2"], status: "engage", planned_cost: 45000000 },
    { project_id: projectId, task_code: "T-003", phase_wbs: "Bon de commande Pompes", budget_line_id: blMap["1.3"], status: "planifie", planned_cost: 18000000 },
    { project_id: projectId, task_code: "T-004", phase_wbs: "Ateliers de formation", budget_line_id: blMap["1.4"], status: "planifie", planned_cost: 9000000 },
    { project_id: projectId, task_code: "T-005", phase_wbs: "Frais de mission Q1-Q2", budget_line_id: blMap["2.1"], status: "decaisse", planned_cost: 12000000, actual_cost: 12400000 },
    { project_id: projectId, task_code: "T-006", phase_wbs: "Contrat cabinet d'audit", budget_line_id: blMap["2.2"], status: "planifie", planned_cost: 8000000 }
  ]

  await adminClient.from('operations_journal').insert(operationsData)

  // 5. Add EVM Tasks
  const tasksData = [
    { project_id: projectId, code: "T1", description: "Études préliminaires", date_start: "2026-01-01", date_end: "2026-03-31", budget_allocated: 8000000, percent_complete: 100, actual_cost: 7800000 },
    { project_id: projectId, code: "T2", description: "Travaux phase 1", date_start: "2026-02-01", date_end: "2026-09-30", budget_allocated: 30000000, percent_complete: 55, actual_cost: 18500000 },
    { project_id: projectId, code: "T3", description: "Travaux phase 2", date_start: "2026-07-01", date_end: "2026-12-31", budget_allocated: 15000000, percent_complete: 0, actual_cost: 0 },
    { project_id: projectId, code: "T4", description: "Équipements", date_start: "2026-04-01", date_end: "2026-11-30", budget_allocated: 18000000, percent_complete: 30, actual_cost: 6200000 },
    { project_id: projectId, code: "T5", description: "Formation", date_start: "2026-09-01", date_end: "2026-12-31", budget_allocated: 9000000, percent_complete: 0, actual_cost: 0 },
    { project_id: projectId, code: "T6", description: "Audit mi-parcours", date_start: "2026-06-01", date_end: "2026-07-31", budget_allocated: 4000000, percent_complete: 80, actual_cost: 3500000 }
  ]

  await adminClient.from('wbs_tasks').insert(tasksData)

  // 6. Add Procurement Plan
  const procurementData = [
    { project_id: projectId, description: "Travaux de réhabilitation", market_type: "Travaux", method: "Appel d'Offres International", review_type: "a_priori", planned_notice_date: "2026-01-15", contract_signature_date: "2026-03-01", estimated_amount: 45000000, status: "planifie" },
    { project_id: projectId, description: "Fourniture équipements", market_type: "Fournitures", method: "Demande de Cotations", review_type: "a_posteriori", planned_notice_date: "2026-04-01", contract_signature_date: "2026-05-15", estimated_amount: 18000000, status: "planifie" },
    { project_id: projectId, description: "Bureau d'études", market_type: "Services", method: "Sélection sur Qualité et Coût", review_type: "a_priori", planned_notice_date: "2025-11-15", contract_signature_date: "2026-01-15", estimated_amount: 8000000, status: "planifie" }
  ]

  await adminClient.from('procurement_plan').insert(procurementData)

  // 7. Add Risks
  const risksData = [
    { project_id: projectId, category: "Financier", description: "Retard de décaissement BAD", probability: 2, impact: 3, mitigation_strategy: "Appel de fonds préventif 30j avant échéance", status: "ouvert" },
    { project_id: projectId, category: "Opérationnel", description: "Retard chantier saison des pluies", probability: 3, impact: 2, mitigation_strategy: "Planning intégrant les mois secs uniquement", status: "ouvert" },
    { project_id: projectId, category: "Fiduciaire", description: "Dépassement budgétaire travaux", probability: 2, impact: 2, mitigation_strategy: "Supervision mensuelle + ordre de service encadré", status: "ouvert" }
  ]

  await adminClient.from('risks').insert(risksData)

  // 8. Add Logframe
  const logframeData = [
    { project_id: projectId, level: "objectif_global", intervention_label: "Améliorer les conditions de vie de 50 000 habitants en zones rurales d'ici 2027", indicator: "Taux d'accès à l'eau potable", baseline: "35%", target: "75%" },
    { project_id: projectId, level: "objectif_specifique", intervention_label: "Réhabiliter 15 ouvrages hydrauliques", indicator: "Nb forages opérationnels", baseline: "4", target: "15" },
    { project_id: projectId, level: "resultat", intervention_label: "Travaux réalisés et réceptionnés", indicator: "PV de réception", baseline: "0", target: "15 PV" },
    { project_id: projectId, level: "activite", intervention_label: "Études topographiques et géotechniques", indicator: "Nb études réalisées", baseline: "0", target: "15" }
  ]

  await adminClient.from('logframe_items').insert(logframeData)

  revalidatePath('/projects')
  return { success: true, projectId }
}
