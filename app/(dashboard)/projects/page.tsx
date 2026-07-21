import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { Header } from '@/components/dashboard/Header'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AlertBadge } from '@/components/ui/AlertBadge'
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

  // VERIFICATION: Ensure the user is actually a member of the requested org (unless in explicit support mode)
  if (effectiveOrgId && !supportOrgIdCookie) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user?.id)
      .eq('organization_id', effectiveOrgId)
      .single()
      
    if (!membership) {
      effectiveOrgId = undefined // Invalide, on force le repli
    }
  }

  // S'il n'y a pas de cookie (ou s'il était invalide), on récupère la première organisation de l'utilisateur
  if (!effectiveOrgId) {
    const { data: memberOrgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user?.id)
      .limit(1)
    
    if (memberOrgs && memberOrgs.length > 0) {
      effectiveOrgId = memberOrgs[0].organization_id
    }
  }

  let query = supabase.from('projects').select('*')
  if (effectiveOrgId) {
    query = query.eq('organization_id', effectiveOrgId)
  } else {
    // Sécurité: Si l'utilisateur n'a aucune organisation, on ne retourne rien plutôt que tout la base (super admin)
    query = query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data: projects, error: projectsError } = await query.order('created_at', { ascending: false })

  const projectIds = projects?.map(p => p.id) || []

  let evmSummaries: any[] | null = []
  let budgetLines: any[] | null = []
  let budgetConsumption: any[] | null = []
  let risks: any[] | null = []

  if (projectIds.length > 0) {
    const { data: es } = await supabase
      .from('v_evm_project_summary')
      .select('*')
      .in('project_id', projectIds)
    evmSummaries = es

    const { data: bl } = await supabase
      .from('budget_lines')
      .select('project_id, initial_allocated_amount')
      .in('project_id', projectIds)
    budgetLines = bl

    const { data: bc } = await supabase
      .from('v_budget_consumption')
      .select('project_id, total_engage, total_decaisse, initial_allocated_amount')
      .in('project_id', projectIds)
    budgetConsumption = bc

    const { data: r } = await supabase
      .from('risks')
      .select('project_id')
      .eq('status', 'ouvert')
      .eq('criticality', 9)
      .in('project_id', projectIds)
    risks = r
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
    hasBudget: (budgetLines || []).length > 0,
    hasOperations,
    hasTasks,
    hasTeamMembers,
    hasPdfReport: evmSummaries?.some(s => s.ac_total > 0) || false,
    firstProjectId: projects.length > 0 ? projects[0].id : undefined
  } : null

  // 1. BLOC KPIs GLOBAUX (Calculs)
  const activeProjects = projects?.filter(p => p.status === 'actif') || []
  const activeProjectIds = activeProjects.map(p => p.id)

  const totalBudgetActif = budgetLines
    ?.filter(bl => activeProjectIds.includes(bl.project_id))
    .reduce((sum, bl) => sum + Number(bl.initial_allocated_amount), 0) || 0

  const totalDecaisseActif = budgetConsumption
    ?.filter(bc => activeProjectIds.includes(bc.project_id))
    .reduce((sum, bc) => sum + Number(bc.total_decaisse), 0) || 0

  let sumBacCpi = 0
  let sumBacSpi = 0
  let totalBacForAvg = 0

  evmSummaries?.forEach(summary => {
    if (activeProjectIds.includes(summary.project_id) && summary.bac_total > 0) {
      sumBacCpi += summary.cpi_global * summary.bac_total
      sumBacSpi += summary.spi_global * summary.bac_total
      totalBacForAvg += summary.bac_total
    }
  })

  const avgCpi = totalBacForAvg > 0 ? sumBacCpi / totalBacForAvg : 1
  const avgSpi = totalBacForAvg > 0 ? sumBacSpi / totalBacForAvg : 1

  // 2. PROJETS EN ALERTE
  const projectsData = projects?.map(p => {
    const summary = evmSummaries?.find(s => s.project_id === p.id)
    const pBudgetConsumption = budgetConsumption?.filter(bc => bc.project_id === p.id) || []
    
    const pTotalBudget = pBudgetConsumption.reduce((sum, bc) => sum + Number(bc.initial_allocated_amount), 0)
    const pTotalConsumed = pBudgetConsumption.reduce((sum, bc) => sum + Number(bc.total_engage) + Number(bc.total_decaisse), 0)
    const pTauxConso = pTotalBudget > 0 ? pTotalConsumed / pTotalBudget : 0
    
    const pRisks = risks?.filter(r => r.project_id === p.id) || []
    
    const bac = summary?.bac_total || 0
    const ac = summary?.ac_total || 0
    const cpi = summary?.cpi_global ?? 1
    const spi = summary?.spi_global ?? 1
    const vac = summary?.vac_global ?? 0

    const alertReasons = []
    if (cpi < 0.9) alertReasons.push(`CPI = ${cpi.toFixed(2)} (Dépassement budgétaire)`)
    if (spi < 0.9) alertReasons.push(`SPI = ${spi.toFixed(2)} (Retard planning)`)
    if (pTauxConso > 1.0) alertReasons.push(`Taux conso = ${(pTauxConso * 100).toFixed(0)}% (> Budget initial)`)
    if (pRisks.length > 0) alertReasons.push(`${pRisks.length} Risque(s) critique(s)`)

    return {
      ...p,
      bac,
      ac,
      cpi,
      spi,
      vac,
      pTotalBudget,
      pTotalConsumed,
      pTauxConso,
      isAlert: alertReasons.length > 0,
      alertReasons,
      progress: bac > 0 ? (ac / bac) * 100 : 0
    }
  }) || []

  const alertProjects = projectsData.filter(p => p.isAlert)

  // Tri du tableau comparatif
  const sortedProjects = [...projectsData].sort((a, b) => {
    let valA: any = a[sort as keyof typeof a]
    let valB: any = b[sort as keyof typeof b]

    if (sort === 'alert') {
      valA = a.isAlert ? 1 : 0
      valB = b.isAlert ? 1 : 0
      if (valA === valB) {
        // Fallback to creation date if same alert status
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    } else if (sort === 'name') {
      valA = a.name.toLowerCase()
      valB = b.name.toLowerCase()
    } else if (sort === 'budget') {
      valA = a.pTotalBudget
      valB = b.pTotalBudget
    } else if (sort === 'conso') {
      valA = a.pTauxConso
      valB = b.pTauxConso
    }

    if (valA < valB) return order === 'asc' ? -1 : 1
    if (valA > valB) return order === 'asc' ? 1 : -1
    return 0
  })

  const getSortLink = (field: string) => {
    const newOrder = sort === field && order === 'desc' ? 'asc' : 'desc'
    return `?sort=${field}&order=${newOrder}`
  }

  return (
    <>
      <Header title="Tableau de bord — Portefeuille" userFullName={profile?.full_name || 'Utilisateur'} />
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Vue consolidée de tous vos projets bailleurs</h2>
          </div>
          <AddProjectModal />
        </div>

        {checklistState && (
          <GettingStartedGuide state={checklistState} />
        )}

        {projectsError ? (
          <div className="p-4 bg-danger/10 text-danger rounded-md border border-danger/20">
            Erreur lors du chargement des projets: {projectsError.message}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl shadow-sm p-12 text-center max-w-2xl mx-auto mt-12">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Bienvenue sur ProjetPilote !</h2>
            <p className="text-text-secondary mb-8">
              Commencez par créer votre premier projet bailleur ou importez vos données existantes.
            </p>
            <div className="flex flex-col gap-4 max-w-xs mx-auto">
              <AddProjectModal />
              {effectiveOrgId && <DemoProjectButton organizationId={effectiveOrgId} />}
              <Link href="/projects/import" className="text-sm font-medium text-text-tertiary hover:text-primary transition-colors inline-flex justify-center items-center mt-2">
                Importer depuis Excel →
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* 1. BLOC KPIs GLOBAUX */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-text-secondary">Projets actifs</span>
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Briefcase className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-text-primary">{activeProjects.length}</div>
              </div>
              
              <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-text-secondary">Budget total</span>
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Target className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-lg font-bold text-text-primary">{formatCurrency(totalBudgetActif)}</div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-text-secondary">Décaissements cumulés</span>
                  <div className="p-2 bg-success/10 rounded-lg text-success">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-lg font-bold text-text-primary">{formatCurrency(totalDecaisseActif)}</div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-text-secondary">CPI moyen</span>
                  <div className="p-2 bg-surface-dim rounded-lg text-text-secondary">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <AlertBadge value={avgCpi} type="cpi" />
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
                        <th className="px-4 py-3 whitespace-nowrap text-right">
                          <Link href={getSortLink('budget')} className="flex justify-end items-center gap-1 hover:text-primary transition-colors">
                            Budget Initial {sort === 'budget' && <ArrowUpDown className="w-3 h-3" />}
                          </Link>
                        </th>
                        <th className="px-4 py-3 whitespace-nowrap">
                          <Link href={getSortLink('conso')} className="flex items-center gap-1 hover:text-primary transition-colors">
                            Consommé {sort === 'conso' && <ArrowUpDown className="w-3 h-3" />}
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
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(p.pTotalBudget)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-xs">
                                <span>{formatCurrency(p.pTotalConsumed)}</span>
                                <span className="font-medium">{(p.pTauxConso * 100).toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-surface-dim rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${p.pTauxConso >= 1 ? 'bg-danger' : p.pTauxConso >= 0.8 ? 'bg-warning' : 'bg-primary'}`} 
                                  style={{ width: `${Math.min(p.pTauxConso * 100, 100)}%` }}
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
                          <td className={`px-4 py-3 text-right font-medium ${p.vac < 0 ? 'text-danger' : 'text-success'}`}>
                            {p.vac < 0 ? '' : '+'}{formatCurrency(p.vac)}
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
                          <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">Aucun projet trouvé.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 4. CARTES EXISTANTES */}
            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="text-xl font-bold text-text-primary">Détail par projet</h3>
              {projects?.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-surface border border-border rounded-xl shadow-sm my-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <Briefcase className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">Bienvenue sur ProjetPilote !</h2>
                  <p className="text-text-secondary max-w-md mx-auto mb-8">
                    Commencez par créer votre premier projet bailleur pour accéder aux fonctionnalités de suivi financier et EVM.
                  </p>
                  <AddProjectModal />
                  <a href="/import-excel" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors mt-6 underline underline-offset-4">
                    Ou importer depuis un fichier Excel existant
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projectsData.map((project) => (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className="bg-surface rounded-lg shadow-sm border border-border p-5 hover:border-primary/50 transition-colors cursor-pointer flex flex-col h-full group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1 block">
                              {project.code || 'SANS CODE'}
                            </span>
                            <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-2">
                              {project.name}
                            </h3>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            project.status === 'actif' ? 'bg-success/10 text-success' : 
                            project.status === 'clos' ? 'bg-text-tertiary/10 text-text-secondary' : 
                            'bg-warning/10 text-warning'
                          }`}>
                            {project.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-text-secondary mb-6">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {project.start_date ? new Date(project.start_date).getFullYear() : 'N/A'} - {project.end_date ? new Date(project.end_date).getFullYear() : 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-auto space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-text-secondary">Consommation ({project.progress.toFixed(0)}%)</span>
                              <span className="font-semibold">{formatCurrency(project.ac)}</span>
                            </div>
                            <div className="w-full bg-surface-dim rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${project.progress >= 100 ? 'bg-danger' : project.progress >= 80 ? 'bg-warning' : 'bg-primary'}`} 
                                style={{ width: `${Math.min(project.progress, 100)}%` }}
                              />
                            </div>
                            <div className="text-right text-xs text-text-tertiary">
                              sur {formatCurrency(project.bac)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-4 border-t border-border">
                            <AlertBadge value={project.cpi} type="cpi" />
                            <AlertBadge value={project.spi} type="spi" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
