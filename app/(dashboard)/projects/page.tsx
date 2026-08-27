import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { Header } from '@/components/dashboard/Header'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AlertBadge } from '@/components/ui/AlertBadge'
import { 
  calculateProjectBAC, calculateProjectPV, calculateProjectEV, calculateProjectAC, calculateIndicators,
  WbsTask, PtbaActivity, OperationJournal
} from '@/lib/utils/evm'
import { Plus, Briefcase, Calendar, AlertTriangle, ArrowUpDown, ChevronRight, Activity, DollarSign, Target } from 'lucide-react'
import { AddProjectModal } from './add-project-modal'
import { DemoProjectButton } from '@/components/dashboard/DemoProjectButton'
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide'
import { Building2, FolderPlus, Coins, FileSpreadsheet, Users, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ sort?: string, order?: string }> }) {
  const { sort = 'alert', order = 'desc' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id)
    .single()

  const cookieStore = await cookies()
  const activeOrgIdCookie = cookieStore.get('active_org_id')?.value
  const supportOrgIdCookie = cookieStore.get('support_org_id')?.value

  let effectiveOrgId = supportOrgIdCookie || activeOrgIdCookie

  let userOrgRole = null
  
  // VERIFICATION: Ensure the user is actually a member of the requested org (unless in explicit support mode)
  if (effectiveOrgId && !supportOrgIdCookie) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, org_role')
      .eq('user_id', user?.id)
      .eq('organization_id', effectiveOrgId)
      .single()
      
    if (!membership) {
      effectiveOrgId = undefined // Invalide, on force le repli
    } else {
      userOrgRole = membership.org_role
    }
  }

  // S'il n'y a pas de cookie (ou s'il était invalide), on récupère la première organisation de l'utilisateur
  if (!effectiveOrgId) {
    const { data: memberOrgs } = await supabase
      .from('organization_members')
      .select('organization_id, org_role')
      .eq('user_id', user?.id)
      .limit(1)
    
    if (memberOrgs && memberOrgs.length > 0) {
      effectiveOrgId = memberOrgs[0].organization_id
      userOrgRole = memberOrgs[0].org_role
    }
  }

  const canCreateProject = supportOrgIdCookie ? true : ['owner', 'admin'].includes(userOrgRole || '')

  let query = supabase.from('projects').select('*')
  if (effectiveOrgId) {
    query = query.eq('organization_id', effectiveOrgId)
  } else {
    // Sécurité: Si l'utilisateur n'a aucune organisation, on ne retourne rien plutôt que tout la base (super admin)
    query = query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data: projects, error: projectsError } = await query.order('created_at', { ascending: false })

  const projectIds = projects?.map(p => p.id) || []

  let budgetLines: any[] = []
  let disbursementsData: any[] = []
  let allSnapshots: any[] = []
  let risks: any[] = []

  if (projectIds.length > 0) {
    const [
      { data: bl },
      { data: disbs },
      { data: snaps },
      { data: r }
    ] = await Promise.all([
      supabase
        .from('budget_lines')
        .select('project_id, initial_allocated_amount')
        .in('project_id', projectIds),
      supabase
        .from('operation_disbursements')
        .select('project_id, amount, disbursement_date, entry_type')
        .in('project_id', projectIds),
      supabase
        .from('evm_snapshots')
        .select(`
          id, project_id, control_date, bac_total, pv_total, ev_total, ac_total, cpi_global, spi_global, eac_global, created_at,
          baseline:baseline_id (
            version_number,
            name
          )
        `)
        .in('project_id', projectIds)
        .order('control_date', { ascending: false }),
      supabase
        .from('risks')
        .select('project_id')
        .eq('status', 'ouvert')
        .eq('criticality', 9)
        .in('project_id', projectIds)
    ])

    budgetLines = bl || []
    disbursementsData = disbs || []
    allSnapshots = (snaps || []) as any[]
    risks = r || []
  }

  // Checklist Data Fetching
  const showGuide = effectiveOrgId && projects && projects.length <= 2
  
  let hasOperations = false
  let hasTasks = false
  let hasTeamMembers = false
  
  if (showGuide) {
    if (projectIds.length > 0) {
      const { count: opsCount } = await supabase.from('operations_journal').select('*', { count: 'exact', head: true }).in('project_id', projectIds)
      hasOperations = (opsCount || 0) > 0
      
      const { count: tasksCount } = await supabase.from('wbs_tasks').select('*', { count: 'exact', head: true }).in('project_id', projectIds)
      hasTasks = (tasksCount || 0) > 0
    }
    
    const { count: membersCount } = await supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', effectiveOrgId)
    hasTeamMembers = (membersCount || 0) > 1
  }

  const checklistState = showGuide ? {
    hasOrganization: true,
    hasProject: projects.some(p => p.code !== 'DEMO-2026'),
    hasBudget: budgetLines.length > 0,
    hasOperations,
    hasTasks,
    hasTeamMembers,
    hasPdfReport: (disbursementsData || []).length > 0,
    firstProjectId: projects.length > 0 ? projects[0].id : undefined
  } : null

  // 1. CONSOLIDATION PAR PROJET
  const projectsData = (projects || []).map(p => {
    const currency = p.currency || 'XOF'
    
    // Budget alloué = SUM(budget_lines.initial_allocated_amount)
    const pBudgetLines = budgetLines.filter(bl => bl.project_id === p.id)
    const budgetAllocated = pBudgetLines.reduce((sum, bl) => sum + (Number(bl.initial_allocated_amount) || 0), 0)

    // Décaissé = SUM(operation_disbursements.amount)
    const pDisbs = disbursementsData.filter(d => d.project_id === p.id)
    const totalDecaisse = pDisbs.reduce((sum, d) => {
      const amount = Number(d.amount) || 0
      return d.entry_type === 'REVERSAL' ? sum - amount : sum + amount
    }, 0)

    // Consommation = Décaissé / Budget alloué * 100
    const consoRate = budgetAllocated > 0 ? (totalDecaisse / budgetAllocated) * 100 : 0

    // Dernier arrêté officiel EVM
    const latestSnapshot = allSnapshots.find(s => s.project_id === p.id) || null

    let cpi: number | null = null
    let spi: number | null = null
    let vac: number | null = null
    let referentiel = 'Aucun arrêté'
    let snapshotDate: string | null = null

    if (latestSnapshot) {
      cpi = latestSnapshot.cpi_global !== null ? Number(latestSnapshot.cpi_global) : null
      spi = latestSnapshot.spi_global !== null ? Number(latestSnapshot.spi_global) : null
      if (latestSnapshot.bac_total !== null && latestSnapshot.eac_global !== null) {
        vac = Number(latestSnapshot.bac_total) - Number(latestSnapshot.eac_global)
      }
      referentiel = latestSnapshot.baseline ? `Baseline V${latestSnapshot.baseline.version_number}` : 'Legacy'
      snapshotDate = latestSnapshot.control_date
    }

    const pRisks = risks.filter(r => r.project_id === p.id)

    const alertReasons: string[] = []
    if (cpi !== null && cpi < 0.9) alertReasons.push(`CPI = ${cpi.toFixed(2)} (Dépassement budgétaire)`)
    if (spi !== null && spi < 0.9) alertReasons.push(`SPI = ${spi.toFixed(2)} (Retard planning)`)
    if (budgetAllocated > 0 && consoRate > 100) alertReasons.push(`Consommation = ${consoRate.toFixed(0)}% (> Budget alloué)`)
    if (pRisks.length > 0) alertReasons.push(`${pRisks.length} Risque(s) critique(s)`)

    return {
      ...p,
      currency,
      budgetAllocated,
      totalDecaisse,
      consoRate,
      cpi,
      spi,
      vac,
      referentiel,
      snapshotDate,
      hasSnapshot: latestSnapshot !== null,
      isAlert: alertReasons.length > 0,
      alertReasons
    }
  })

  // 2. BLOC KPIS GLOBAUX DU PORTFOLIO
  const activeProjects = projectsData.filter(p => p.status === 'actif')
  
  // CPI / SPI Moyens arithmétiques sur projets mesurables
  const validCpis = activeProjects.map(p => p.cpi).filter((v): v is number => v !== null && !isNaN(v))
  const validSpis = activeProjects.map(p => p.spi).filter((v): v is number => v !== null && !isNaN(v))

  const avgCpi = validCpis.length > 0 ? validCpis.reduce((a, b) => a + b, 0) / validCpis.length : null
  const avgSpi = validSpis.length > 0 ? validSpis.reduce((a, b) => a + b, 0) / validSpis.length : null

  // Agrégations par devise (Sans conversion inter-devises)
  const activeCurrencies = Array.from(new Set(activeProjects.map(p => p.currency)))
  
  const aggregatesByCurrency = activeCurrencies.map(curr => {
    const currProjects = activeProjects.filter(p => p.currency === curr)
    const totalBudgetAlloue = currProjects.reduce((sum, p) => sum + p.budgetAllocated, 0)
    const totalDecaisse = currProjects.reduce((sum, p) => sum + p.totalDecaisse, 0)
    return {
      currency: curr,
      totalBudgetAlloue,
      totalDecaisse,
      projectCount: currProjects.length
    }
  })

  const alertProjects = projectsData.filter(p => p.isAlert)

  // Tri du tableau
  const sortedProjects = [...projectsData].sort((a, b) => {
    let valA: any = a[sort as keyof typeof a]
    let valB: any = b[sort as keyof typeof b]

    if (sort === 'alert') {
      valA = a.isAlert ? 1 : 0
      valB = b.isAlert ? 1 : 0
      if (valA === valB) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    } else if (sort === 'name') {
      valA = (a.name || '').toLowerCase()
      valB = (b.name || '').toLowerCase()
    } else if (sort === 'budget') {
      valA = a.budgetAllocated
      valB = b.budgetAllocated
    } else if (sort === 'conso') {
      valA = a.consoRate
      valB = b.consoRate
    } else if (sort === 'cpi') {
      valA = a.cpi ?? -999
      valB = b.cpi ?? -999
    } else if (sort === 'spi') {
      valA = a.spi ?? -999
      valB = b.spi ?? -999
    } else if (sort === 'vac') {
      valA = a.vac ?? -999999999
      valB = b.vac ?? -999999999
    }

    if (valA < valB) return order === 'asc' ? -1 : 1
    if (valA > valB) return order === 'asc' ? 1 : -1
    return 0
  })

  const getSortLink = (field: string) => {
    const newOrder = sort === field && order === 'desc' ? 'asc' : 'desc'
    return `?sort=${field}&order=${newOrder}`
  }

  const globalCurrency = (projects && projects.length > 0) ? (projects[0].currency || 'XOF') : 'XOF'

  return (
    <>
      <Header title="Tableau de bord — Portefeuille" userFullName={profile?.full_name || 'Utilisateur'} />
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Vue consolidée du portefeuille</h2>
          </div>
          {canCreateProject && <AddProjectModal />}
        </div>

        {projectsError ? (
          <div className="p-4 bg-danger/10 text-danger rounded-md border border-danger/20">
            Erreur lors du chargement des projets: {projectsError.message}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl shadow-sm p-12 text-center max-w-2xl mx-auto mt-12">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Bienvenue sur ProjetPilote !</h2>
            <p className="text-text-secondary mb-8">
              {canCreateProject 
                ? "Commencez par créer votre premier projet ou importez vos données existantes."
                : "Demandez à un administrateur de créer votre premier projet."}
            </p>
            <div className="flex flex-col gap-4 max-w-xs mx-auto">
              {canCreateProject && (
                <>
                  <AddProjectModal />
                  {effectiveOrgId && <DemoProjectButton organizationId={effectiveOrgId} />}
                  <Link href="/projects/import" className="text-sm font-medium text-text-tertiary hover:text-primary transition-colors inline-flex justify-center items-center mt-2">
                    Importer depuis Excel →
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {activeCurrencies.length > 1 && (
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm border border-blue-200 mb-4 flex items-start gap-2">
                <span className="text-xl">ℹ️</span>
                <p>Les montants globaux sont présentés séparément dans la devise de chaque projet. Aucune conversion n'est appliquée.</p>
              </div>
            )}
            {/* 1. BLOC KPIs GLOBAUX */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-text-secondary">Projets actifs</span>
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Briefcase className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-text-primary">{activeProjects.length}</div>
              </div>
              
              {aggregatesByCurrency.map(agg => (
                <div key={`budget-${agg.currency}`} className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-text-secondary">
                      Budget alloué {activeCurrencies.length > 1 ? `(${agg.currency})` : ''}
                    </span>
                    <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0 ml-2">
                      <Target className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-text-primary whitespace-nowrap" title={formatCurrency(agg.totalBudgetAlloue, agg.currency, true)}>
                    {formatCurrency(agg.totalBudgetAlloue, agg.currency, true)}
                  </div>
                </div>
              ))}

              {aggregatesByCurrency.map(agg => (
                <div key={`decaisse-${agg.currency}`} className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-text-secondary">
                      Décaissements {activeCurrencies.length > 1 ? `(${agg.currency})` : ''}
                    </span>
                    <div className="p-2 bg-success/10 rounded-lg text-success shrink-0 ml-2">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-text-primary whitespace-nowrap" title={formatCurrency(agg.totalDecaisse, agg.currency, true)}>
                    {formatCurrency(agg.totalDecaisse, agg.currency, true)}
                  </div>
                </div>
              ))}

              <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-text-secondary">CPI moyen</span>
                  <div className="p-2 bg-surface-dim rounded-lg text-text-secondary">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <AlertBadge value={avgCpi} type="cpi" />
                  <span className="text-[11px] text-text-secondary mt-1 block">
                    sur {validCpis.length} projet(s) mesurable(s)
                  </span>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-text-secondary">SPI moyen</span>
                  <div className="p-2 bg-surface-dim rounded-lg text-text-secondary">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <AlertBadge value={avgSpi} type="spi" />
                  <span className="text-[11px] text-text-secondary mt-1 block">
                    sur {validSpis.length} projet(s) mesurable(s)
                  </span>
                </div>
              </div>
            </div>

            {/* 2. SECTION PROJETS EN ALERTE */}
            {alertProjects.length > 0 && (
              <div className="bg-danger/5 border border-danger/20 rounded-xl overflow-hidden">
                <div className="bg-danger/10 px-4 py-3 border-b border-danger/20 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-danger" />
                  <h3 className="font-bold text-danger">Projets nécessitant une attention immédiate</h3>
                </div>
                <div className="p-4 space-y-3">
                  {alertProjects.map(p => (
                    <div key={`alert-${p.id}`} className="flex items-center justify-between bg-surface p-3 rounded-lg border border-danger/10 shadow-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold bg-danger/10 text-danger px-2 py-0.5 rounded uppercase tracking-wider">{p.code}</span>
                          <span className="font-semibold text-text-primary">{p.name}</span>
                        </div>
                        <p className="text-sm text-text-secondary">
                          {p.alertReasons.join(' — ')}
                        </p>
                      </div>
                      <Link href={`/projects/${p.id}`} className="px-3 py-1.5 bg-surface-dim hover:bg-surface-container border border-border rounded text-sm font-medium text-primary transition-colors flex items-center gap-1">
                        Voir <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. TABLEAU COMPARATIF */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-text-primary">Comparaison des projets</h3>
              <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-surface-dim text-text-secondary font-medium border-b border-border">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap">
                          <Link href={getSortLink('name')} className="flex items-center gap-1 hover:text-primary transition-colors">
                            Projet {sort === 'name' && <ArrowUpDown className="w-3 h-3" />}
                          </Link>
                        </th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3">Devise</th>
                        <th className="px-4 py-3 whitespace-nowrap text-right">
                          <Link href={getSortLink('budget')} className="flex justify-end items-center gap-1 hover:text-primary transition-colors">
                            Budget Alloué {sort === 'budget' && <ArrowUpDown className="w-3 h-3" />}
                          </Link>
                        </th>
                        <th className="px-4 py-3 whitespace-nowrap">
                          <Link href={getSortLink('conso')} className="flex items-center gap-1 hover:text-primary transition-colors">
                            Décaissé / Conso {sort === 'conso' && <ArrowUpDown className="w-3 h-3" />}
                          </Link>
                        </th>
                        <th className="px-4 py-3 text-center">
                          <Link href={getSortLink('cpi')} className="flex justify-center items-center gap-1 hover:text-primary transition-colors">
                            CPI {sort === 'cpi' && <ArrowUpDown className="w-3 h-3" />}
                          </Link>
                        </th>
                        <th className="px-4 py-3 text-center">
                          <Link href={getSortLink('spi')} className="flex justify-center items-center gap-1 hover:text-primary transition-colors">
                            SPI {sort === 'spi' && <ArrowUpDown className="w-3 h-3" />}
                          </Link>
                        </th>
                        <th className="px-4 py-3 text-center">Référentiel</th>
                        <th className="px-4 py-3 whitespace-nowrap text-right">
                          <Link href={getSortLink('vac')} className="flex justify-end items-center gap-1 hover:text-primary transition-colors">
                            Variance (VAC) {sort === 'vac' && <ArrowUpDown className="w-3 h-3" />}
                          </Link>
                        </th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortedProjects.map(p => (
                        <tr key={`row-${p.id}`} className="hover:bg-surface-dim/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-text-primary line-clamp-1" title={p.name}>{p.name}</div>
                            <div className="text-xs text-text-tertiary">{p.code}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                              p.status === 'actif' ? 'bg-success/10 text-success' : 
                              p.status === 'clos' ? 'bg-text-tertiary/10 text-text-secondary' : 
                              'bg-warning/10 text-warning'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-bold text-text-secondary px-2 py-0.5 bg-surface-dim rounded border border-border">
                              {p.currency}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(p.budgetAllocated, p.currency, true)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-xs">
                                <span>{formatCurrency(p.totalDecaisse, p.currency, true)}</span>
                                <span className="font-medium">
                                  {p.budgetAllocated > 0 ? `${p.consoRate.toFixed(1)}%` : 'N/A'}
                                </span>
                              </div>
                              <div className="w-full bg-surface-dim rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${p.consoRate >= 100 ? 'bg-danger' : p.consoRate >= 80 ? 'bg-warning' : 'bg-primary'}`} 
                                  style={{ width: `${Math.min(p.consoRate, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <AlertBadge value={p.cpi} type="cpi" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <AlertBadge value={p.spi} type="spi" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {p.hasSnapshot ? (
                              <div className="flex flex-col items-center">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  p.referentiel.startsWith('Baseline')
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                                    : 'bg-surface-dim text-text-secondary border border-border'
                                }`}>
                                  {p.referentiel}
                                </span>
                                {p.snapshotDate && (
                                  <span className="text-[10px] text-text-tertiary mt-0.5">
                                    au {new Date(p.snapshotDate).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                                Aucun arrêté
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {p.vac !== null ? (
                              <span className={p.vac < 0 ? 'text-danger font-semibold' : 'text-success font-semibold'}>
                                {p.vac > 0 ? '+' : ''}{formatCurrency(p.vac, p.currency, true)}
                              </span>
                            ) : (
                              <span className="text-text-secondary">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/projects/${p.id}`} className="text-primary hover:text-primary/80 font-medium text-sm">
                              Ouvrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {sortedProjects.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-text-secondary">Aucun projet trouvé.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 4. LIEN VERS TOUS LES PROJETS */}
            <div className="flex justify-center pt-6 border-t border-border mt-8">
              <Link 
                href="/projects/list" 
                className="flex items-center gap-2 px-6 py-3 bg-surface border border-border hover:border-primary/50 rounded-xl text-text-primary font-medium hover:text-primary transition-all shadow-sm hover:shadow-md"
              >
                <Briefcase className="w-5 h-5" />
                Voir tous les projets en détail
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  )
}
