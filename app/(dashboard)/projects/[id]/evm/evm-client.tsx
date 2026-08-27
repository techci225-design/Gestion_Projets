'use client'

import { useState, useTransition } from 'react'
import { Plus, Save, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { updateEvmDate, deleteEvmTask } from '@/lib/actions/evm.actions'
import { createEvmSnapshot } from '@/lib/actions/evm-snapshots.actions'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddEvmTaskModal } from './add-evm-task-modal'
import { EditEvmTaskModal } from './edit-evm-task-modal'
import { EvmHistory } from './evm-history'
import { ImportTasksButton } from '@/components/dashboard/ImportTasksButton'
import { EvmAiAnalysis } from '@/components/dashboard/evm-ai-analysis'
import { EvmBaselineManager } from '@/components/dashboard/evm-baseline-manager'
import { EvmBaseline } from '@/lib/actions/baseline.actions'

function AlertBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-surface-dim text-text-secondary">
        N/A
      </span>
    )
  }
  if (value >= 1) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-secondary-container text-on-secondary-container">
        {value.toFixed(2)}
      </span>
    )
  }
  if (value >= 0.9) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-tertiary-fixed text-on-tertiary-container">
        {value.toFixed(2)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-error-container text-on-error-container">
      {value.toFixed(2)}
    </span>
  )
}

export function EvmClient({ 
  projectId, 
  project, 
  summary, 
  indicators,
  snapshots,
  baselines = [],
  budgetLines = [],
  canManageSnapshots = false
}: { 
  projectId: string, 
  project: any, 
  summary: any, 
  indicators: any[],
  snapshots: any[],
  baselines?: EvmBaseline[],
  budgetLines?: any[],
  canManageSnapshots?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [controlDate, setControlDate] = useState(project.evm_control_date || new Date().toISOString().split('T')[0])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [selectedResponsable, setSelectedResponsable] = useState('Tous les responsables')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setControlDate(newDate)
    startTransition(() => {
      updateEvmDate(projectId, newDate)
    })
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return
    setIsDeleting(taskId)
    const res = await deleteEvmTask(projectId, taskId)
    setIsDeleting(null)
    if (res?.error) {
      alert(res.error)
    }
  }

  const [isSaving, setIsSaving] = useState(false)
  
  const handleSaveSnapshot = async () => {
    if (!summary) return
    setIsSaving(true)
    try {
      const data = {
        control_date: controlDate,
      }
      const res = await createEvmSnapshot(projectId, data)
      if (res.error) {
        alert(res.error)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const cpiGlobal = summary?.cpi_global ?? null
  const spiGlobal = summary?.spi_global ?? null

  const todayStr = new Date().toISOString().split('T')[0]
  const isPast = controlDate < todayStr
  const isFuture = controlDate > todayStr
  const existingSnapshot = snapshots.find(s => s.control_date === controlDate)
  const hasExistingSnapshot = Boolean(existingSnapshot)
  const isUncertifiedRetroactive = isPast && !hasExistingSnapshot
  const isSaveDisabled = isSaving || !summary || isUncertifiedRetroactive || isFuture || hasExistingSnapshot

  const responsables = Array.from(new Set(indicators.map(i => i.responsible).filter(Boolean))) as string[]
  const filteredIndicators = selectedResponsable === 'Tous les responsables'
    ? indicators
    : indicators.filter(i => i.responsible === selectedResponsable)

  let filteredEV = 0
  let filteredAC = 0
  let filteredPV = 0
  filteredIndicators.forEach(i => {
    filteredEV += Number(i.ev)
    filteredAC += Number(i.actual_cost)
    filteredPV += Number(i.pv)
  })
  const filteredCPI = filteredAC === 0 ? null : filteredEV / filteredAC
  const filteredSPI = filteredPV === 0 ? null : filteredEV / filteredPV

  const totalPages = Math.ceil(filteredIndicators.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedItems = filteredIndicators.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="flex flex-col space-y-6 pb-12">
      {/* Page Header & EVM Summary */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div className="flex-shrink-0 space-y-1">
          <h1 className="text-2xl font-semibold text-primary">Suivi de la Valeur Acquise (EVM)</h1>
          <div className="flex flex-wrap items-center gap-2">
            {summary?.mode === 'BASELINE' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Mode Baseline : V{summary.baseline.version_number} ({summary.baseline.name}) — BAC : {formatCurrency(summary.bac_total, project?.currency, true)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Mode EVM historique — aucune baseline applicable au {new Date(controlDate).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ImportTasksButton projectId={projectId} />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nouvelle tâche
          </button>
          
          <div className="bg-white/90 backdrop-blur-sm border border-white/20 shadow-sm p-3 md:p-4 rounded-xl flex flex-wrap items-center gap-4 lg:gap-6">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-text-secondary mb-1">Arrêté des comptes au :</label>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={controlDate}
                  onChange={handleDateChange}
                  disabled={isPending}
                  className="text-sm bg-surface border border-border rounded-md px-3 py-1.5 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer disabled:opacity-50"
                />
                <button
                  onClick={handleSaveSnapshot}
                  disabled={isSaveDisabled}
                  className={`p-1.5 border rounded-md transition-colors flex items-center gap-1 text-sm font-medium pr-3 ${
                    isSaveDisabled 
                      ? 'bg-surface-dim text-text-tertiary border-border cursor-not-allowed opacity-50'
                      : 'bg-surface-dim hover:bg-border text-primary border-border cursor-pointer'
                  }`}
                  title={
                    hasExistingSnapshot
                      ? "Un arrêté officiel est déjà enregistré et certifié pour cette date."
                      : isUncertifiedRetroactive 
                        ? "La sauvegarde officielle est verrouillée pour les calculs rétroactifs non certifiés."
                        : isFuture 
                          ? "Impossible d'enregistrer un arrêté officiel pour une date future."
                          : "Sauvegarder l'arrêté officiel du jour"
                  }
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden md:inline">Sauvegarder</span>
                </button>
              </div>
            </div>
            
            <div className="hidden sm:block h-10 w-px bg-border mx-1"></div>
            
            <div className="flex flex-col">
              <label className="text-sm font-medium text-text-secondary mb-1">Responsable :</label>
              <select
                value={selectedResponsable}
                onChange={(e) => {
                  setSelectedResponsable(e.target.value)
                  setCurrentPage(1)
                }}
                className="text-sm bg-surface border border-border rounded-md px-3 py-1.5 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              >
                <option value="Tous les responsables">Tous les responsables</option>
                {responsables.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {selectedResponsable !== 'Tous les responsables' && (
                <div className="text-[11px] font-medium text-primary mt-1">
                  CPI filtré : {filteredCPI !== null ? filteredCPI.toFixed(2) : 'N/A'} | SPI filtré : {filteredSPI !== null ? filteredSPI.toFixed(2) : 'N/A'}
                </div>
              )}
            </div>
            <div className="hidden sm:block h-10 w-px bg-border mx-1"></div>
            
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-text-secondary mb-1">CPI Global</span>
                <div className="bg-secondary-container text-on-secondary-container text-lg font-semibold px-4 py-1 rounded-full border border-secondary-fixed">
                  {cpiGlobal !== null ? Number(cpiGlobal).toFixed(2) : 'N/A'}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-text-secondary mb-1">SPI Global</span>
                <div className="bg-tertiary-fixed text-on-tertiary-container text-lg font-semibold px-4 py-1 rounded-full border border-tertiary-fixed-dim">
                  {spiGlobal !== null ? Number(spiGlobal).toFixed(2) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EvmAiAnalysis projectId={projectId} currency={project?.currency} />

      {/* Section 2: Référentiel Contractuel & Baseline EVM */}
      <EvmBaselineManager 
        projectId={projectId}
        currency={project?.currency}
        initialBaselines={baselines}
        budgetLines={budgetLines}
      />

      {/* Diagnostics Temporels & Hors Baseline */}
      <div className="space-y-3">
        {summary?.ac_out_of_baseline > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900 dark:text-amber-300">
                Dépenses hors périmètre de baseline : {formatCurrency(summary.ac_out_of_baseline, project?.currency, true)}
              </p>
              <p className="text-xs text-text-secondary">
                Des décaissements sont rattachés à des tâches créées hors de la baseline approuvée (AC Baseline : {formatCurrency(summary.ac_baseline, project?.currency, true)} | AC Total : {formatCurrency(summary.ac_total, project?.currency, true)}). Ces coûts sont inclus dans l'AC global pour garantir la sincérité du CPI.
              </p>
            </div>
          </div>
        )}

        {isUncertifiedRetroactive && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-blue-900 dark:text-blue-300">
                Simulation historique non certifiée
              </p>
              <p className="text-xs text-text-secondary">
                Ce calcul rétroactif est une simulation basée sur l'avancement physique actuel des tâches (% achevé). L'avancement passé n'étant pas disponible de manière certifiable à cette date, les valeurs d'EV, CPI et SPI sont indicatives et l'enregistrement comme arrêté officiel est désactivé.
              </p>
            </div>
          </div>
        )}

        {isFuture && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-start gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-purple-900 dark:text-purple-300">
                Simulation prévisionnelle future
              </p>
              <p className="text-xs text-text-secondary">
                La date de contrôle sélectionnée est dans le futur. L'enregistrement d'un arrêté officiel n'est pas autorisé pour les dates futures.
              </p>
            </div>
          </div>
        )}

        {hasExistingSnapshot && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300 font-medium">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Un arrêté officiel a été enregistré et certifié pour la date du {new Date(controlDate).toLocaleDateString('fr-FR')}.
            </span>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white/90 backdrop-blur-sm border border-white/20 shadow-sm rounded-xl flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-dim border-b border-border">
                <th className="p-4 text-xs font-medium text-text-secondary w-24">Code</th>
                <th className="p-4 text-xs font-medium text-text-secondary">Description</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-40">Responsable</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-48">Période</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-32">% Avancement</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-32 text-right">Budget Alloué</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-32 text-right">Coût Réel</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-24 text-center">CPI</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-24 text-center">SPI</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-text-primary">
              {paginatedItems.map((item, index) => {
                const startDate = new Date(item.date_start).toLocaleDateString('fr-FR')
                const endDate = new Date(item.date_end).toLocaleDateString('fr-FR')
                const progressColor = item.percent_complete === 100 ? 'bg-secondary' : 'bg-primary'
                
                return (
                  <tr key={item.id} className={`border-b border-border hover:bg-surface-bright transition-colors h-12 ${index % 2 !== 0 ? 'bg-surface-dim/30' : ''}`}>
                    <td className="p-4 font-medium text-xs">
                      <div className="flex items-center gap-1.5">
                        {item.code}
                        {item.warnings && item.warnings.length > 0 && (
                          <div className="group relative flex items-center">
                            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs bg-surface-dimmer text-text-primary text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-pre-wrap text-left border border-border">
                              {item.warnings.join('\n')}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium">{item.description}</td>
                    <td className="p-4">{item.responsible || '-'}</td>
                    <td className="p-4 text-text-secondary text-xs">{startDate} – {endDate}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-right text-xs font-medium">{item.percent_complete}%</span>
                        <div className="flex-1 h-2 bg-surface-dim rounded-full overflow-hidden">
                          <div className={`h-full ${progressColor}`} style={{ width: `${item.percent_complete}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium">{formatCurrency(item.budget_allocated, project?.currency, true)}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(item.actual_cost, project?.currency, true)}</td>
                    <td className="p-4 text-center">
                      <AlertBadge value={item.cpi} />
                    </td>
                    <td className="p-4 text-center">
                      <AlertBadge value={item.spi} />
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setTaskToEdit(item)}
                          className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting === item.id}
                          className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-text-secondary">Aucune tâche EVM enregistrée</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {indicators.length > 0 && (
          <div className="p-2 border-t border-border bg-surface-dim flex justify-between items-center text-text-secondary text-xs">
            <span className="px-2">Affichage {startIndex + 1} à {Math.min(startIndex + itemsPerPage, indicators.length)} sur {indicators.length} éléments</span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded hover:bg-surface transition-colors disabled:opacity-50"
              >
                Précédent
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded hover:bg-surface transition-colors disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      <EvmHistory projectId={projectId} snapshots={snapshots} currentSummary={summary} currency={project?.currency} canManageSnapshots={canManageSnapshots} />

      <AddEvmTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        projectId={projectId} 
        currency={project?.currency}
      />

      {taskToEdit && (
        <EditEvmTaskModal 
          isOpen={!!taskToEdit} 
          onClose={() => setTaskToEdit(null)} 
          projectId={projectId}
          task={taskToEdit}
          currency={project?.currency}
        />
      )}
    </div>
  )
}
