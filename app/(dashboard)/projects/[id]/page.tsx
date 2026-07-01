import React from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'
import { EvmDateSelector } from '@/components/dashboard/EvmDateSelector'
import { GaugeCPISPI } from '@/components/dashboard/GaugeCPISPI'
import { SCurveChart } from '@/components/dashboard/SCurveChart'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AlertTriangle } from 'lucide-react'

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Tableau de bord EVM</h2>
            <p className="text-sm text-text-secondary">Analyse de la Valeur Acquise</p>
          </div>
          <EvmDateSelector projectId={project.id} currentDate={project.evm_control_date} />
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
        <div className="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-danger" />
            <h3 className="font-semibold text-text-primary">Top Foyers de Surconsommation (Top 5)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-dim text-xs uppercase text-text-secondary font-semibold">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Variance (CV)</th>
                  <th className="px-6 py-3 text-right">CPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topVariances && topVariances.length > 0 ? (
                  topVariances.map((v) => (
                    <tr key={v.id} className="hover:bg-surface-dim/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-text-primary">{v.code}</td>
                      <td className="px-6 py-3 text-text-secondary">{v.description}</td>
                      <td className="px-6 py-3 text-right font-medium text-danger">
                        {formatCurrency(v.cv)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="bg-danger/10 text-danger px-2 py-0.5 rounded-full text-xs font-semibold">
                          {Number(v.cpi).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-text-secondary">
                      Aucun écart négatif constaté pour la date sélectionnée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  )
}
