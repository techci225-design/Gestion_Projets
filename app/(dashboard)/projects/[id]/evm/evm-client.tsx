'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { updateEvmDate } from '@/lib/actions/evm.actions'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddEvmTaskModal } from './add-evm-task-modal'

function AlertBadge({ value }: { value: number }) {
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
  indicators 
}: { 
  projectId: string, 
  project: any, 
  summary: any, 
  indicators: any[] 
}) {
  const [isPending, startTransition] = useTransition()
  const [controlDate, setControlDate] = useState(project.evm_control_date || new Date().toISOString().split('T')[0])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setControlDate(newDate)
    startTransition(() => {
      updateEvmDate(projectId, newDate)
    })
  }

  const cpiGlobal = summary?.cpi_global || 1
  const spiGlobal = summary?.spi_global || 1

  const totalPages = Math.ceil(indicators.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedItems = indicators.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="flex flex-col h-full">
      {/* Page Header & EVM Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary mb-1">Suivi de la Valeur Acquise (EVM)</h1>
          <p className="text-sm text-text-secondary">Analyse des performances de coût et de délai</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvelle tâche
          </button>
          
          <div className="bg-white/90 backdrop-blur-sm border border-white/20 shadow-sm p-4 rounded-xl flex items-center gap-6">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-text-secondary mb-1">Arrêté des comptes au :</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={controlDate}
                  onChange={handleDateChange}
                  disabled={isPending}
                  className="text-sm bg-surface border border-border rounded-md px-3 py-1.5 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>
            <div className="h-10 w-px bg-border mx-1"></div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-text-secondary mb-1">CPI Global</span>
                <div className="bg-secondary-container text-on-secondary-container text-lg font-semibold px-4 py-1 rounded-full border border-secondary-fixed">
                  {Number(cpiGlobal).toFixed(2)}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-text-secondary mb-1">SPI Global</span>
                <div className="bg-tertiary-fixed text-on-tertiary-container text-lg font-semibold px-4 py-1 rounded-full border border-tertiary-fixed-dim">
                  {Number(spiGlobal).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white/90 backdrop-blur-sm border border-white/20 shadow-sm rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
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
              </tr>
            </thead>
            <tbody className="text-sm text-text-primary">
              {paginatedItems.map((item, index) => {
                const startDate = new Date(item.date_start).toLocaleDateString('fr-FR')
                const endDate = new Date(item.date_end).toLocaleDateString('fr-FR')
                const progressColor = item.percent_complete === 100 ? 'bg-secondary' : 'bg-primary'
                
                return (
                  <tr key={item.id} className={`border-b border-border hover:bg-surface-bright transition-colors h-12 ${index % 2 !== 0 ? 'bg-surface-dim/30' : ''}`}>
                    <td className="p-4 font-medium text-xs">{item.code}</td>
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
                    <td className="p-4 text-right font-medium">{formatCurrency(item.budget_allocated)}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(item.actual_cost)}</td>
                    <td className="p-4 text-center">
                      <AlertBadge value={Number(item.cpi)} />
                    </td>
                    <td className="p-4 text-center">
                      <AlertBadge value={Number(item.spi)} />
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

      <AddEvmTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        projectId={projectId} 
      />
    </div>
  )
}
