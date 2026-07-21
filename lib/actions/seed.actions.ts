'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function seedDemoProject(organizationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // 1. Create Project
  const { data: project, error: projectError } = await supabase
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
  const { error: memberError } = await supabase.from('project_members').insert({
    project_id: projectId,
    user_id: user.id,
    role: 'owner'
  })

  if (memberError) {
    console.error('Demo project member error:', memberError)
    return { error: 'Erreur lors de la création du membre du projet.' }
  }

  // 2. Add Funding Sources
  const { data: badSource, error: badError } = await supabase
    .from('funding_sources')
    .insert({
      project_id: projectId,
      name: "Banque Africaine de Développement (BAD)",
      code: "BAD",
      currency: "XOF",
      total_amount: 80000000
    })
    .select()
    .single()

  const { data: etatSource, error: etatError } = await supabase
    .from('funding_sources')
    .insert({
      project_id: projectId,
      name: "Contrepartie État",
      code: "ETAT",
      currency: "XOF",
      total_amount: 20000000
    })
    .select()
    .single()

  if (badError || etatError) return { error: 'Erreur sources financement' }

  // 3. Add Budget Lines
  const budgetLinesData = [
    { code: "1.1", name: "Études et conception", initial_allocated_amount: 8000000, funding_source_id: badSource.id, project_id: projectId },
    { code: "1.2", name: "Travaux de génie civil", initial_allocated_amount: 45000000, funding_source_id: badSource.id, project_id: projectId },
    { code: "1.3", name: "Équipements hydrauliques", initial_allocated_amount: 18000000, funding_source_id: badSource.id, project_id: projectId },
    { code: "1.4", name: "Renforcement des capacités", initial_allocated_amount: 9000000, funding_source_id: badSource.id, project_id: projectId },
    { code: "2.1", name: "Fonctionnement et mission", initial_allocated_amount: 12000000, funding_source_id: etatSource.id, project_id: projectId },
    { code: "2.2", name: "Audit et évaluation", initial_allocated_amount: 8000000, funding_source_id: etatSource.id, project_id: projectId }
  ]

  const { data: budgetLines, error: blError } = await supabase
    .from('budget_lines')
    .insert(budgetLinesData)
    .select()

  if (blError || !budgetLines) return { error: 'Erreur lignes budgétaires' }

  const blMap = budgetLines.reduce((acc, bl) => ({ ...acc, [bl.code]: bl.id }), {} as Record<string, string>)

  // 4. Add Operations Journal
  const operationsData = [
    { project_id: projectId, reference: "T-001", description: "Études préliminaires (Acompte)", date: "2026-02-15", budget_line_id: blMap["1.1"], status: "decaisse", planned_cost: 8000000, actual_cost: 7800000 },
    { project_id: projectId, reference: "T-002", description: "Avance de démarrage", date: "2026-03-01", budget_line_id: blMap["1.2"], status: "engage", planned_cost: 45000000 },
    { project_id: projectId, reference: "T-003", description: "Bon de commande Pompes", date: "2026-04-10", budget_line_id: blMap["1.3"], status: "planifie", planned_cost: 18000000 },
    { project_id: projectId, reference: "T-004", description: "Ateliers de formation", date: "2026-09-01", budget_line_id: blMap["1.4"], status: "planifie", planned_cost: 9000000 },
    { project_id: projectId, reference: "T-005", description: "Frais de mission Q1-Q2", date: "2026-06-15", budget_line_id: blMap["2.1"], status: "decaisse", planned_cost: 12000000, actual_cost: 12400000 },
    { project_id: projectId, reference: "T-006", description: "Contrat cabinet d'audit", date: "2026-06-01", budget_line_id: blMap["2.2"], status: "planifie", planned_cost: 8000000 }
  ]

  await supabase.from('operations_journal').insert(operationsData)

  // 5. Add EVM Tasks
  const tasksData = [
    { project_id: projectId, code: "T1", description: "Études préliminaires", date_start: "2026-01-01", date_end: "2026-03-31", budget_allocated: 8000000, percent_complete: 100, actual_cost: 7800000 },
    { project_id: projectId, code: "T2", description: "Travaux phase 1", date_start: "2026-02-01", date_end: "2026-09-30", budget_allocated: 30000000, percent_complete: 55, actual_cost: 18500000 },
    { project_id: projectId, code: "T3", description: "Travaux phase 2", date_start: "2026-07-01", date_end: "2026-12-31", budget_allocated: 15000000, percent_complete: 0, actual_cost: 0 },
    { project_id: projectId, code: "T4", description: "Équipements", date_start: "2026-04-01", date_end: "2026-11-30", budget_allocated: 18000000, percent_complete: 30, actual_cost: 6200000 },
    { project_id: projectId, code: "T5", description: "Formation", date_start: "2026-09-01", date_end: "2026-12-31", budget_allocated: 9000000, percent_complete: 0, actual_cost: 0 },
    { project_id: projectId, code: "T6", description: "Audit mi-parcours", date_start: "2026-06-01", date_end: "2026-07-31", budget_allocated: 4000000, percent_complete: 80, actual_cost: 3500000 }
  ]

  await supabase.from('wbs_tasks').insert(tasksData)

  // 6. Add Procurement Plan
  const procurementData = [
    { project_id: projectId, title: "Travaux de réhabilitation", category: "Travaux", method: "Appel d'Offres International", review_type: "A priori", date_avis: "2026-01-15", date_signature: "2026-03-01", amount: 45000000, status: "planifie" },
    { project_id: projectId, title: "Fourniture équipements", category: "Fournitures", method: "Demande de Cotations", review_type: "A posteriori", date_avis: "2026-04-01", date_signature: "2026-05-15", amount: 18000000, status: "planifie" },
    { project_id: projectId, title: "Bureau d'études", category: "Services", method: "Sélection sur Qualité et Coût", review_type: "A priori", date_avis: "2025-11-15", date_signature: "2026-01-15", amount: 8000000, status: "planifie" }
  ]

  await supabase.from('procurement_plan').insert(procurementData)

  // 7. Add Risks
  const risksData = [
    { project_id: projectId, category: "Financier", title: "Retard de décaissement BAD", probability: 2, impact: 3, mitigation_strategy: "Appel de fonds préventif 30j avant échéance", status: "ouvert" },
    { project_id: projectId, category: "Opérationnel", title: "Retard chantier saison des pluies", probability: 3, impact: 2, mitigation_strategy: "Planning intégrant les mois secs uniquement", status: "ouvert" },
    { project_id: projectId, category: "Fiduciaire", title: "Dépassement budgétaire travaux", probability: 2, impact: 2, mitigation_strategy: "Supervision mensuelle + ordre de service encadré", status: "ouvert" }
  ]

  await supabase.from('risks').insert(risksData)

  // 8. Add Logframe
  const logframeData = [
    { project_id: projectId, level: 1, title: "Améliorer les conditions de vie de 50 000 habitants en zones rurales d'ici 2027", indicators: "Taux d'accès à l'eau potable", baseline: "35%", target: "75%" },
    { project_id: projectId, level: 2, title: "Réhabiliter 15 ouvrages hydrauliques", indicators: "Nb forages opérationnels", baseline: "4", target: "15" },
    { project_id: projectId, level: 3, title: "Travaux réalisés et réceptionnés", indicators: "PV de réception", baseline: "0", target: "15 PV" },
    { project_id: projectId, level: 4, title: "Études topographiques et géotechniques", indicators: "Nb études réalisées", baseline: "0", target: "15" }
  ]

  await supabase.from('logframe_items').insert(logframeData)

  revalidatePath('/projects')
  return { success: true, projectId }
}
