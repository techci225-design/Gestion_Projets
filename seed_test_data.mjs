import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log("Fetching first project...")
  const { data: projects, error: projErr } = await supabase.from('projects').select('id').limit(1)
  if (projErr || !projects || projects.length === 0) {
    console.error("Error fetching project or no project found", projErr)
    return
  }
  
  const projectId = projects[0].id
  console.log("Using project ID:", projectId)

  // Clear existing data for this project
  console.log("Clearing old data...")
  await supabase.from('risks').delete().eq('project_id', projectId)
  await supabase.from('procurement_plan').delete().eq('project_id', projectId)
  await supabase.from('ptba_activities').delete().eq('project_id', projectId)
  // logframe_items has parent_id foreign key, deleting root might cascade or just delete all
  await supabase.from('logframe_items').delete().eq('project_id', projectId)

  // 1. Seed Logframe EXACTLY as in Excel
  console.log("Seeding Logframe...")
  const { data: objGlobal } = await supabase.from('logframe_items').insert({
    project_id: projectId,
    level: 'objectif_global',
    intervention_label: "Objectif Global (Impact)",
    indicator: "Taux de pauvreté, PIB régional...",
    baseline: "Chiffre de l'année N-1",
    target: "Objectif à 5-10 ans",
    verification_source: "Rapports nationaux, stats",
    risks_assumptions: "Instabilité politique majeure"
  }).select().single()

  const { data: objSpec } = await supabase.from('logframe_items').insert({
    project_id: projectId,
    parent_id: objGlobal.id,
    level: 'objectif_specifique',
    intervention_label: "Objectif Spécifique (Effets)",
    indicator: "Taux d'accès à l'eau potable",
    baseline: "40% (2023)",
    target: "80% (2026)",
    verification_source: "Enquête ménages du projet",
    risks_assumptions: "Sécheresse extrême"
  }).select().single()

  const { data: res } = await supabase.from('logframe_items').insert({
    project_id: projectId,
    parent_id: objSpec.id,
    level: 'resultat',
    intervention_label: "Résultats (Extrants/Outputs)",
    indicator: "Nombre de forages construits",
    baseline: "0",
    target: "50",
    verification_source: "PV de réception des travaux",
    risks_assumptions: "Retard dans la livraison"
  }).select().single()

  const { data: act } = await supabase.from('logframe_items').insert({
    project_id: projectId,
    parent_id: res.id,
    level: 'activite',
    intervention_label: "Activités",
    indicator: "Lancement des appels d'offres",
    baseline: "(Budget alloué)",
    target: "(Budget dépensé)",
    verification_source: "Contrats signés",
    risks_assumptions: "Faible réponse des prestataires"
  }).select().single()

  // 2. Seed PTBA EXACTLY as in Excel (using previous knowledge of PTBA)
  console.log("Seeding PTBA...")
  await supabase.from('ptba_activities').insert([
    {
      project_id: projectId,
      code: "1.0",
      description: "Infrastructures en eau",
      responsible: "Ingénieur Chef",
      fiscal_year: new Date().getFullYear(),
      q1: false, q2: false, q3: false, q4: false,
      budget_allocated: 500000
    },
    {
      project_id: projectId,
      code: "1.1",
      description: "Études topographiques",
      responsible: "Cabinet externe",
      fiscal_year: new Date().getFullYear(),
      q1: true, q2: false, q3: false, q4: false,
      budget_allocated: 50000
    },
    {
      project_id: projectId,
      logframe_item_id: act.id,
      code: "1.2",
      description: "Forage et installation",
      responsible: "Entreprise BTP",
      fiscal_year: new Date().getFullYear(),
      q1: false, q2: true, q3: true, q4: false,
      budget_allocated: 400000
    },
    {
      project_id: projectId,
      code: "1.3",
      description: "Formation des comités",
      responsible: "Expert Social",
      fiscal_year: new Date().getFullYear(),
      q1: false, q2: false, q3: false, q4: true,
      budget_allocated: 50000
    }
  ])

  // 3. Seed Procurement Plan EXACTLY as in Excel
  console.log("Seeding PPM...")
  await supabase.from('procurement_plan').insert([
    {
      project_id: projectId,
      description: "Construction de 50 forages",
      market_type: "Travaux",
      method: "AOI (Appel d'Offres International)",
      review_type: "a_priori",
      estimated_amount: 400000,
      status: "Planifié"
    },
    {
      project_id: projectId,
      description: "Audit financier du projet",
      market_type: "Services de Consultants",
      method: "SFQC (Sélection Fondée sur la Qualité et Coût)",
      review_type: "a_posteriori",
      estimated_amount: 30000,
      status: "Planifié"
    }
  ])

  // 4. Seed Risks EXACTLY as in Excel
  console.log("Seeding Risks...")
  await supabase.from('risks').insert([
    {
      project_id: projectId,
      category: "Fiduciaire",
      description: "Détournement de fonds ou corruption",
      probability: 1,
      impact: 3,
      mitigation_strategy: "Audits annuels, manuel de procédures strict",
      responsible: "Spécialiste Financier",
      status: "ouvert"
    },
    {
      project_id: projectId,
      category: "Opérationnel",
      description: "Retard dans la livraison des chantiers",
      probability: 3,
      impact: 2,
      mitigation_strategy: "Pénalités de retard dans les contrats, suivi hebd.",
      responsible: "Chef de Projet",
      status: "ouvert"
    }
  ])

  console.log("Seed completed successfully!")
}

seed().catch(console.error)
