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
import { Briefcase, Calendar, ChevronRight } from 'lucide-react'
import { AddProjectModal } from '../add-project-modal'

export const dynamic = 'force-dynamic'

export default async function ProjectsListPage() {
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
  
  if (effectiveOrgId && !supportOrgIdCookie) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, org_role')
      .eq('user_id', user?.id)
      .eq('organization_id', effectiveOrgId)
      .single()
      
    if (!membership) {
      effectiveOrgId = undefined
    } else {
      userOrgRole = membership.org_role
    }
  }

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
    query = query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data: projects, error: projectsError } = await query.order('created_at', { ascending: false })
  const projectIds = projects?.map(p => p.id) || []

  let evmSummaries: any[] | null = []
  let budgetConsumption: any[] | null = []
  let fundingSources: any[] | null = []

  if (projectIds.length > 0) {
    const { data: wbsTasksData } = await supabase
      .from('wbs_tasks')
      .select('id, project_id, parent_id, task_type, code, description, responsible, date_start, date_end, percent_complete')
      .in('project_id', projectIds)

    const wbsTaskIds = (wbsTasksData || []).map((t: any) => t.id)

    const { data: ptbaActivitiesData } = await supabase
      .from('ptba_activities')
      .select('wbs_task_id, fiscal_year, budget_planned')
      .in('wbs_task_id', wbsTaskIds)

    const { data: journalData } = await supabase
      .from('operations_journal')
      .select('wbs_task_id, status, actual_cost, operation_date')
      .in('wbs_task_id', wbsTaskIds)

    const allWbsTasks = (wbsTasksData || []) as (WbsTask & { project_id: string })[]
    const allPtba = (ptbaActivitiesData || []) as PtbaActivity[]
    const allOps = (journalData || []) as OperationJournal[]

    evmSummaries = (projects || []).map(project => {
      const pWbsTasks = allWbsTasks.filter(t => t.project_id === project.id)
      const pWbsTaskIds = pWbsTasks.map(t => t.id)
      const pPtba = allPtba.filter(p => pWbsTaskIds.includes(p.wbs_task_id))
      const pOps = allOps.filter(o => pWbsTaskIds.includes(o.wbs_task_id))
      
      const statusDateStr = project.evm_control_date || new Date().toISOString().split('T')[0]
      const pBAC = calculateProjectBAC(pWbsTasks, pPtba)
      const pPV = calculateProjectPV(statusDateStr, pWbsTasks, pPtba).pv
      const pEV = calculateProjectEV(pWbsTasks, pPtba)
      const pAC = calculateProjectAC(statusDateStr, pWbsTasks, pOps)
      const pInd = calculateIndicators(pBAC, pPV, pEV, pAC)

      return {
        project_id: project.id,
        cpi_global: pInd.cpi,
        spi_global: pInd.spi
      }
    })

    const { data: bc } = await supabase
      .from('v_budget_consumption')
      .select('project_id, total_engage, total_decaisse, initial_allocated_amount')
      .in('project_id', projectIds)
    budgetConsumption = bc

    const { data: fs } = await supabase
      .from('funding_sources')
      .select('project_id, amount_committed')
      .in('project_id', projectIds)
    fundingSources = fs
  }

  const projectsData = projects?.map(p => {
    const summary = evmSummaries?.find(s => s.project_id === p.id)
    const pBudgetConsumption = budgetConsumption?.filter(bc => bc.project_id === p.id) || []
    const pFundingSources = fundingSources?.filter(fs => fs.project_id === p.id) || []
    
    const pTotalBudgetFromLines = pBudgetConsumption.reduce((sum, bc) => sum + Number(bc.initial_allocated_amount), 0)
    const pTotalFunding = pFundingSources.reduce((sum, fs) => sum + Number(fs.amount_committed), 0)
    
    const pTotalBudget = pTotalFunding > 0 ? pTotalFunding : (pTotalBudgetFromLines > 0 ? pTotalBudgetFromLines : (p.budget || 0))
    const pTotalConsumed = pBudgetConsumption.reduce((sum, bc) => sum + Number(bc.total_engage) + Number(bc.total_decaisse), 0)
    const pTauxConso = pTotalBudget > 0 ? pTotalConsumed / pTotalBudget : 0
    
    const cpi = summary?.cpi_global ?? 1
    const spi = summary?.spi_global ?? 1

    return {
      ...p,
      cpi,
      spi,
      pTotalBudget,
      pTotalConsumed,
      pTauxConso,
    }
  }) || []

  return (
    <>
      <Header title="Liste des projets" userFullName={profile?.full_name || 'Utilisateur'} />
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Tous vos projets</h2>
          </div>
          {canCreateProject && <AddProjectModal />}
        </div>

        {projectsError ? (
          <div className="p-4 bg-danger/10 text-danger rounded-md border border-danger/20">
            Erreur lors du chargement des projets: {projectsError.message}
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
                        <span className="text-text-secondary">Consommation ({(project.pTauxConso * 100).toFixed(0)}%)</span>
                        <span className="font-semibold">{formatCurrency(project.pTotalConsumed, project.currency, true)}</span>
                      </div>
                      <div className="w-full bg-surface-dim rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${project.pTauxConso >= 1 ? 'bg-danger' : project.pTauxConso >= 0.8 ? 'bg-warning' : 'bg-primary'}`} 
                          style={{ width: `${Math.min(project.pTauxConso * 100, 100)}%` }}
                        />
                      </div>
                      <div className="text-right text-xs text-text-tertiary">
                        sur {formatCurrency(project.pTotalBudget, project.currency, true)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                      <div className="flex items-center gap-2">
                        <AlertBadge value={project.cpi} type="cpi" />
                        <AlertBadge value={project.spi} type="spi" />
                      </div>
                      <div className="text-sm font-medium text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Gérer <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {projectsData.length === 0 && (
              <div className="col-span-full py-12 text-center text-text-secondary">
                Aucun projet disponible.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
