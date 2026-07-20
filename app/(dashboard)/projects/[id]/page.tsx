import React from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'
import { EvmDateSelector } from '@/components/dashboard/EvmDateSelector'
import { GaugeCPISPI } from '@/components/dashboard/GaugeCPISPI'
import { SCurveChart } from '@/components/dashboard/SCurveChart'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AlertTriangle } from 'lucide-react'
import { TopVariancesChart } from '@/components/dashboard/TopVariancesChart'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'

export default async function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  const resolvedParams = await params

  // Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (!project) {
    notFound()
  }

  // Fetch user for Header
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id).single()

  // Fetch EVM summary
  const { data: summary } = await supabase
    .from('v_evm_project_summary')
    .select('*')
    .eq('project_id', resolvedParams.id)
    .single()

  // Fetch EVM Tasks for the S-Curve
  const { data: tasks } = await supabase
    .from('v_evm_tasks')
    .select('*')
    .eq('project_id', resolvedParams.id)
    .order('date_end', { ascending: true })

  // Transform tasks for SCurveChart (cumulative values for the project over tasks)
  let cumulPV = 0
  let cumulEV = 0
  let cumulAC = 0
  const curveData = tasks?.map(t => {
    cumulPV += Number(t.pv)
    cumulEV += Number(t.ev)
    cumulAC += Number(t.actual_cost)
    return {
      name: t.code, // Utilise le code de la tâche en X
      pv: cumulPV,
      ev: cumulEV,
      ac: cumulAC,
    }
  }) || []

  // Fetch Top 5 cost variances (CV negative)
  const { data: topVariances } = await supabase
    .from('v_evm_indicators')
    .select('*')
    .eq('project_id', resolvedParams.id)
    .lt('cv', 0)
    .order('cv', { ascending: true }) // Plus grand écart négatif en premier
    .limit(5)

  const bac = summary?.bac_total || 0
  const eac = summary?.eac_global || bac
  const vac = bac - eac // Variance At Completion (Budget - Estimate)

  return (
    <>
      <Header title={`EVM: ${project.name}`} userFullName={profile?.full_name || 'Utilisateur'} />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Top Bar: Title & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Tableau de bord EVM</h2>
            <p className="text-sm text-text-secondary">Analyse de la Valeur Acquise</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <EvmDateSelector projectId={project.id} currentDate={project.evm_control_date} />
            <ExportPdfButton projectId={project.id} />
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface p-5 rounded-lg shadow-sm border border-border">
            <h3 className="text-sm font-medium text-text-secondary mb-1">Budget Initial (BAC)</h3>
            <p className="text-2xl font-bold text-primary">{formatCurrency(bac)}</p>
          </div>
          <div className="bg-surface p-5 rounded-lg shadow-sm border border-border">
            <h3 className="text-sm font-medium text-text-secondary mb-1">Estimé à l'Achèvement (EAC)</h3>
            <p className="text-2xl font-bold text-primary">{formatCurrency(eac)}</p>
          </div>
          <div className={`p-5 rounded-lg shadow-sm border ${vac < 0 ? 'bg-danger/5 border-danger/20' : 'bg-success/5 border-success/20'}`}>
            <h3 className={`text-sm font-medium mb-1 ${vac < 0 ? 'text-danger' : 'text-success'}`}>Variance à l'Achèvement (VAC)</h3>
            <p className={`text-2xl font-bold ${vac < 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(vac)}</p>
          </div>
        </div>

        {/* Charts & Gauges */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SCurveChart data={curveData} />
          </div>
          <div className="flex flex-col gap-6">
            <GaugeCPISPI value={summary?.cpi_global || 1} label="Performance Coût (CPI)" />
            <GaugeCPISPI value={summary?.spi_global || 1} label="Performance Délai (SPI)" />
          </div>
        </div>

        {/* Top 5 Variances */}
        <TopVariancesChart data={topVariances || []} />

      </div>
    </>
  )
}
