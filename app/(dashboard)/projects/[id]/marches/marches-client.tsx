'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddMarcheModal } from './add-marche-modal'

export function MarchesClient({ projectId, marches }: { projectId: string, marches: any[] }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const types = Array.from(new Set(marches.map(m => m.market_type).filter(Boolean)))
  const statuses = Array.from(new Set(marches.map(m => m.status).filter(Boolean)))

  const filteredMarches = marches.filter(m => {
    if (typeFilter !== 'all' && m.market_type !== typeFilter) return false
    if (statusFilter !== 'all' && m.status !== statusFilter) return false
    return true
  })

  const getAlertStatus = (noticeDateStr: string | null, signatureDateStr: string | null) => {
    if (!noticeDateStr && !signatureDateStr) return 'none'
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    let closestDiff = Infinity
    if (noticeDateStr) {
      const noticeDate = new Date(noticeDateStr)
      closestDiff = Math.min(closestDiff, (noticeDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
    }
    if (signatureDateStr) {
      const signatureDate = new Date(signatureDateStr)
      closestDiff = Math.min(closestDiff, (signatureDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
    }

    if (closestDiff < 0) return 'red'
    if (closestDiff <= 15) return 'orange'
    return 'none'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-primary">Plan de Passation des Marchés</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-container text-on-primary-container hover:bg-primary-container/90 px-4 py-2 rounded flex items-center gap-2 font-medium text-sm transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nouveau Marché
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm border border-border p-6 flex flex-col gap-4">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Filtres</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-text-secondary mb-1">Type de marché</label>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border-border rounded bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary py-2 px-3 outline-none"
            >
              <option value="all">Tous les types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-text-secondary mb-1">Statut</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border-border rounded bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary py-2 px-3 outline-none"
            >
              <option value="all">Tous les statuts</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex gap-4 mt-2 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-tertiary-container"></div>
            <span className="text-xs text-text-secondary">● Échéance proche (&lt; 15 jours)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-error"></div>
            <span className="text-xs text-text-secondary">● Échéance dépassée</span>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-dim border-b border-border">
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary">Description du marché</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary">Type</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary">Méthode</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary">Revue</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary">Avis prévu</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary">Signature</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary text-right">Montant estimé</th>
              </tr>
            </thead>
            <tbody className="text-sm text-text-primary">
              {filteredMarches.map((m, index) => {
                const alert = getAlertStatus(m.planned_notice_date, m.contract_signature_date)
                let dotClass = ''
                if (alert === 'red') dotClass = 'text-error'
                if (alert === 'orange') dotClass = 'text-tertiary-container'

                return (
                  <tr key={m.id} className={`border-b border-border hover:bg-surface-bright transition-colors h-12 ${index % 2 !== 0 ? 'bg-surface-dim/30' : ''}`}>
                    <td className="py-3 px-4 font-medium flex items-center gap-2">
                      <span className={`w-2 h-2 flex-shrink-0 rounded-full ${alert === 'none' ? 'bg-transparent' : 'bg-current'} ${dotClass}`}></span>
                      {m.description}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-surface-dim text-primary text-xs px-2 py-1 rounded">
                        {m.market_type || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{m.method || '-'}</td>
                    <td className="py-3 px-4 capitalize">{m.review_type?.replace('_', ' ') || '-'}</td>
                    <td className="py-3 px-4">{m.planned_notice_date ? new Date(m.planned_notice_date).toLocaleDateString('fr-FR') : '-'}</td>
                    <td className="py-3 px-4">{m.contract_signature_date ? new Date(m.contract_signature_date).toLocaleDateString('fr-FR') : '-'}</td>
                    <td className="py-3 px-4 text-right font-semibold">{m.estimated_amount ? formatCurrency(m.estimated_amount) : '-'}</td>
                  </tr>
                )
              })}
              {filteredMarches.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-secondary">Aucun marché enregistré</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddMarcheModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        projectId={projectId} 
      />
    </div>
  )
}
