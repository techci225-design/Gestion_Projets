import React from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'
import { formatCurrency } from '@/lib/utils/format-currency'
import { CalendarDays, Wallet, Building2, AlignLeft, Landmark, Clock, Users, ArrowUpRight, ArrowDownRight, Activity, AlertTriangle, Flame, LayoutDashboard, Target, Briefcase, ChevronRight } from 'lucide-react'
import { format, differenceInMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

// Composants du Tableau de Bord EVM
import { GaugeCPISPI } from '@/components/dashboard/GaugeCPISPI'
import { SCurveChart } from '@/components/dashboard/SCurveChart'
import { TopVariancesChart } from '@/components/dashboard/TopVariancesChart'
import { BurnRateChart } from '@/components/dashboard/BurnRateChart'

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const resolvedParams = await params
  const { id } = resolvedParams

  // 1. Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) {
    notFound()
  }

  // 2. Fetch user profile for Header
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id).single()

  // 3. Fetch Financial Consumption
  const { data: budgetConsumption } = await supabase.from('v_budget_consumption').select('*').eq('project_id', id)
  const { data: fundingSources } = await supabase.from('funding_sources').select('amount').eq('project_id', id)

  // Calcule le budget global à partir de v_budget_consumption (lignes budgétaires)
  const totalBudgetFromLines = budgetConsumption?.reduce((acc, curr) => acc + (Number(curr.initial_allocated_amount) || 0), 0) || 0
  const totalFunding = fundingSources?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0
  
  // Utilise par ordre de priorité: Lignes budgétaires > Sources de financement > Budget global projet
  const totalBudget = totalBudgetFromLines > 0 ? totalBudgetFromLines : (totalFunding > 0 ? totalFunding : (project.budget || 0))
  
  const totalEngage = budgetConsumption?.reduce((acc, curr) => acc + (Number(curr.total_engage) || 0), 0) || 0
  const totalDecaisse = budgetConsumption?.reduce((acc, curr) => acc + (Number(curr.total_decaisse) || 0), 0) || 0
  const soldeDisponible = totalBudget - totalEngage - totalDecaisse

  // 4. Fetch EVM Data
  const { data: evmSummary } = await supabase.from('v_evm_project_summary').select('*').eq('project_id', id).single()
  const { data: evmSnapshots } = await supabase.from('evm_snapshots').select('*').eq('project_id', id).order('control_date', { ascending: true })
  const { data: evmIndicators } = await supabase.from('v_evm_indicators').select('*').eq('project_id', id)
  const { data: operations } = await supabase.from('operations_journal').select('*').eq('project_id', id).order('created_at', { ascending: true })

  // EVM Calculations
  const cpi = evmSummary?.cpi_global || 1
  const spi = evmSummary?.spi_global || 1
  const evTotal = evmSummary?.ev_total || 0
  const bacTotal = evmSummary?.bac_total || totalBudget
  const avancementProgress = bacTotal > 0 ? (evTotal / bacTotal) * 100 : 0

  // 5. Prepare Chart Data
  const sCurveData = evmSnapshots?.map(s => ({
    name: new Date(s.control_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
    pv: Number(s.pv_total) || 0,
    ev: Number(s.ev_total) || 0,
    ac: Number(s.ac_total) || 0,
  })) || []

  // Top Variances: Top 5 Worst Costs (Negative CV)
  const topVariances = evmIndicators
    ?.filter(i => Number(i.cv) < 0)
    .sort((a, b) => Number(a.cv) - Number(b.cv))
    .slice(0, 5)
    .map(i => ({
      id: i.id,
      code: i.code,
      description: i.description,
      cv: Number(i.cv),
      cpi: Number(i.cpi)
    })) || []

  // 6. Dates
  const startDate = project.start_date ? new Date(project.start_date) : null
  const endDate = project.end_date ? new Date(project.end_date) : null
  const durationMonths = startDate && endDate ? differenceInMonths(endDate, startDate) : 0

  return (
    <>
      <Header title={`Vue d'ensemble : ${project.name}`} userFullName={profile?.full_name || 'Utilisateur'} />
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* En-tête du Projet */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-2xl shadow-sm border border-border">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">{project.name}</h1>
            </div>
            <p className="text-text-secondary flex items-center gap-2">
              <span className="font-mono bg-surface-dim px-2 py-0.5 rounded text-sm border border-border">Code: {project.code}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-medium text-text-secondary">Statut du Projet</span>
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm border ${
              project.status === 'active' || project.status === 'actif'
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-warning/10 text-warning border-warning/20'
            }`}>
              {project.status === 'active' ? 'En cours' : project.status === 'actif' ? 'En cours' : project.status}
            </span>
          </div>
        </div>

        {/* Section 1 : KPIs Financiers & Avancement (Résumé Exécutif) */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            Résumé Exécutif
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            <div className="bg-gradient-to-br from-primary to-blue-700 text-white border border-primary/20 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-white/80">Budget Global</span>
                <Target className="w-4 h-4 text-white/80" />
              </div>
              <div className="text-xl font-bold whitespace-nowrap">{formatCurrency(totalBudget, 'FCFA', true)}</div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-text-secondary">Engagé</span>
                <ArrowUpRight className="w-4 h-4 text-warning" />
              </div>
              <div className="text-xl font-bold text-text-primary whitespace-nowrap">{formatCurrency(totalEngage, 'FCFA', true)}</div>
              <div className="text-xs text-text-secondary mt-1">
                {totalBudget > 0 ? ((totalEngage / totalBudget) * 100).toFixed(1) : 0}% du budget
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-text-secondary">Décaissé</span>
                <Wallet className="w-4 h-4 text-success" />
              </div>
              <div className="text-xl font-bold text-text-primary whitespace-nowrap">{formatCurrency(totalDecaisse, 'FCFA', true)}</div>
              <div className="text-xs text-text-secondary mt-1">
                {totalEngage > 0 ? ((totalDecaisse / totalEngage) * 100).toFixed(1) : 0}% des engagements
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-text-secondary">Solde (Dispo)</span>
                <ArrowDownRight className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xl font-bold text-text-primary whitespace-nowrap">{formatCurrency(soldeDisponible, 'FCFA', true)}</div>
              <div className="text-xs text-text-secondary mt-1">
                Reste à engager
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-text-secondary">Avancement</span>
                <Activity className="w-4 h-4 text-secondary" />
              </div>
              <div className="text-2xl font-bold text-secondary">{avancementProgress.toFixed(1)}%</div>
              <div className="w-full bg-surface-dim rounded-full h-1.5 mt-2">
                <div 
                  className="h-full bg-secondary rounded-full" 
                  style={{ width: `${Math.min(avancementProgress, 100)}%` }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Section 2 : Tableau de Bord EVM & Alertes */}
        <div className="space-y-4 pt-6 border-t border-border">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Analyse de Performance (EVM) & Alertes
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Jauges CPI / SPI */}
            <div className="flex flex-col gap-4">
              <GaugeCPISPI value={cpi} label="Indice de Coût (CPI)" />
              <GaugeCPISPI value={spi} label="Indice de Délai (SPI)" />
            </div>

            {/* Courbe en S */}
            <div className="lg:col-span-2">
              {sCurveData.length > 0 ? (
                <SCurveChart data={sCurveData} />
              ) : (
                <div className="bg-surface rounded-lg shadow-sm border border-border p-8 flex flex-col items-center justify-center h-full min-h-[300px]">
                  <Activity className="w-10 h-10 text-text-tertiary mb-3 opacity-50" />
                  <p className="text-text-secondary font-medium text-center">Courbe en S non disponible</p>
                  <p className="text-xs text-text-tertiary text-center mt-1">Générez au moins un arrêté EVM pour visualiser l'historique.</p>
                </div>
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
            {/* Burn Rate Chart */}
            <BurnRateChart operations={operations || []} />

            {/* Top Variances Chart */}
            <TopVariancesChart data={topVariances} />
          </div>

        </div>

        {/* Section 3 : Informations Complémentaires (Description, Gouvernance, Calendrier) */}
        <div className="space-y-4 pt-6 border-t border-border">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <AlignLeft className="w-5 h-5 text-text-secondary" />
            Détails Opérationnels
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-surface rounded-2xl shadow-sm border border-border p-6 h-full">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
                Description & Objectif Central
              </h3>
              <div className="prose prose-sm max-w-none text-text-secondary whitespace-pre-wrap">
                {project.description || "Aucune description fournie pour ce projet."}
              </div>
            </div>

            <div className="space-y-6">
              {/* Calendrier */}
              <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> 
                  Calendrier
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-surface-dim rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-text-secondary font-medium">Début</p>
                        <p className="text-sm font-bold text-text-primary">
                          {startDate ? format(startDate, 'dd MMM yyyy', { locale: fr }) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-secondary font-medium">Fin</p>
                      <p className="text-sm font-bold text-text-primary">
                        {endDate ? format(endDate, 'dd MMM yyyy', { locale: fr }) : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-medium text-text-secondary">Durée estimée</span>
                    <span className="text-sm font-bold text-primary">{durationMonths} mois</span>
                  </div>
                </div>
              </div>

              {/* Gouvernance */}
              <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Landmark className="w-4 h-4" /> Financement / Bailleur
                  </h3>
                  <p className="text-base font-bold text-text-primary ml-6">
                    {project.funder || "Non défini"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Maître d'œuvre
                  </h3>
                  <p className="text-base font-bold text-text-primary ml-6">
                    {project.implementing_agency || "Non défini"}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </>
  )
}
