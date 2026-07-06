'use client'

import React, { useState } from 'react'
import { Plus, Download, Filter } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddPtbaModal } from './add-ptba-modal'

export interface PtbaActivity {
  id: string
  project_id: string
  code: string
  description: string
  responsible: string | null
  fiscal_year: number | null
  q1: boolean
  q2: boolean
  q3: boolean
  q4: boolean
  budget_planned: number
}

export function PtbaClient({ items, projectId }: { items: PtbaActivity[], projectId: string }) {
  const [yearFilter, setYearFilter] = useState('all')
  const [responsibleFilter, setResponsibleFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const years = Array.from(new Set(items.map(i => i.fiscal_year).filter((y): y is number => y != null))).sort().reverse()
  const responsibles = Array.from(new Set(items.map(i => i.responsible).filter((r): r is string => r != null))).sort()

  const filteredItems = items.filter(item => {
    if (yearFilter !== 'all' && String(item.fiscal_year) !== yearFilter) return false
    if (responsibleFilter !== 'all' && item.responsible !== responsibleFilter) return false
    return true
  })

  const totalBudget = filteredItems.reduce((acc, item) => acc + Number(item.budget_planned), 0)

  const exportCSV = () => {
    const headers = ['Code', 'Activité', 'Responsable', 'Q1', 'Q2', 'Q3', 'Q4', 'Budget Prévu (FCFA)']
    const rows = filteredItems.map(i => [
      i.code,
      `"${i.description.replace(/"/g, '""')}"`,
      i.responsible || '',
      i.q1 ? 'Oui' : 'Non',
      i.q2 ? 'Oui' : 'Non',
      i.q3 ? 'Oui' : 'Non',
      i.q4 ? 'Oui' : 'Non',
      i.budget_planned
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `ptba_${projectId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Filters Bar */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-border flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-text-secondary">Année Fiscale</label>
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          >
            <option value="all">Toutes les années</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-text-secondary">Responsable</label>
          <select 
            value={responsibleFilter} 
            onChange={(e) => setResponsibleFilter(e.target.value)}
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          >
            <option value="all">Tous les responsables</option>
            {responsibles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex gap-4 ml-auto mt-4 sm:mt-0">
          <button 
            onClick={exportCSV}
            className="bg-surface-dim text-primary py-2 px-4 rounded-md text-sm font-medium border border-border hover:bg-border transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white py-2 px-4 rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouvelle activité
          </button>
        </div>
      </div>

      {/* Planning Table */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-dim border-b border-border">
                <th className="text-xs font-semibold text-text-secondary p-4 whitespace-nowrap">Code</th>
                <th className="text-xs font-semibold text-text-secondary p-4 w-1/3">Activité</th>
                <th className="text-xs font-semibold text-text-secondary p-4 whitespace-nowrap">Responsable</th>
                <th className="text-xs font-semibold text-text-secondary p-4 text-center">Q1</th>
                <th className="text-xs font-semibold text-text-secondary p-4 text-center">Q2</th>
                <th className="text-xs font-semibold text-text-secondary p-4 text-center">Q3</th>
                <th className="text-xs font-semibold text-text-secondary p-4 text-center">Q4</th>
                <th className="text-xs font-semibold text-text-secondary p-4 text-right whitespace-nowrap">Budget Prévu (FCFA)</th>
              </tr>
            </thead>
            <tbody className="text-sm text-text-primary">
              {filteredItems.map((item, idx) => (
                <tr key={item.id} className={`border-b border-border hover:bg-surface transition-colors h-12 ${idx % 2 !== 0 ? 'bg-slate-50' : 'bg-white'}`}>
                  <td className="p-4 font-medium text-primary">{item.code}</td>
                  <td className="p-4">{item.description}</td>
                  <td className="p-4 text-text-secondary">{item.responsible || '—'}</td>
                  <td className="p-4 text-center">
                    {item.q1 && <div className="w-3 h-3 rounded-full bg-primary mx-auto"></div>}
                  </td>
                  <td className="p-4 text-center">
                    {item.q2 && <div className="w-3 h-3 rounded-full bg-primary mx-auto"></div>}
                  </td>
                  <td className="p-4 text-center">
                    {item.q3 && <div className="w-3 h-3 rounded-full bg-primary mx-auto"></div>}
                  </td>
                  <td className="p-4 text-center">
                    {item.q4 && <div className="w-3 h-3 rounded-full bg-primary mx-auto"></div>}
                  </td>
                  <td className="p-4 text-right font-medium">{formatCurrency(item.budget_planned)}</td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-secondary">Aucune activité trouvée</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-surface-dim border-t-2 border-border h-12">
                <td className="p-4 text-sm font-semibold text-right" colSpan={7}>Total Général</td>
                <td className="p-4 text-sm font-semibold text-right text-primary whitespace-nowrap">{formatCurrency(totalBudget)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AddPtbaModal 
          projectId={projectId}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
