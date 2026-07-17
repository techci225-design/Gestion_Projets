'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Download, CheckCircle2, WalletCards } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddBudgetModal } from './add-budget-modal'
import { BurnRateChart } from '@/components/dashboard/BurnRateChart'
import { useSearchParams, useRouter } from 'next/navigation'

export interface BudgetConsumption {
  budget_line_id: string
  project_id: string
  code: string
  label: string
  responsible?: string | null
  initial_allocated_amount: number
  total_engage: number
  total_decaisse: number
  solde_disponible: number
  taux_consommation: number
  niveau_alerte: 'vert' | 'orange' | 'rouge' | 'neutre'
}

export function BudgetClient({ items, fundingSources, operations, projectId, isNewProject }: { items: BudgetConsumption[], fundingSources?: any[], operations?: any[], projectId: string, isNewProject?: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showBanner, setShowBanner] = useState(isNewProject)
  const [selectedResponsable, setSelectedResponsable] = useState('Tous les responsables')

  useEffect(() => {
    if (showBanner) {
      const timer = setTimeout(() => setShowBanner(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showBanner])

  const responsables = Array.from(new Set(items.map(i => i.responsible).filter(Boolean))) as string[]
  const filteredItems = selectedResponsable === 'Tous les responsables'
    ? items
    : items.filter(i => i.responsible === selectedResponsable)

  // Calculate totals
  const totalAllocated = filteredItems.reduce((acc, item) => acc + Number(item.initial_allocated_amount), 0)
  const totalEngage = filteredItems.reduce((acc, item) => acc + Number(item.total_engage), 0)
  const totalDecaisse = filteredItems.reduce((acc, item) => acc + Number(item.total_decaisse), 0)
  const totalConsumed = totalEngage + totalDecaisse
  
  const totalConsumptionRate = totalAllocated > 0 ? (totalConsumed / totalAllocated) * 100 : 0
  
  // Group by category (e.g. "1. Équipements" if code starts with "1.")
  const categories = filteredItems.reduce((acc, item) => {
    const mainCode = item.code.split('.')[0]
    if (!acc[mainCode]) acc[mainCode] = []
    acc[mainCode].push(item)
    return acc
  }, {} as Record<string, BudgetConsumption[]>)

  const sortedKeys = Object.keys(categories).sort()

  const getAlertColor = (alerte: string) => {
    switch (alerte) {
      case 'vert': return 'bg-success text-success'
      case 'orange': return 'bg-warning text-warning'
      case 'rouge': return 'bg-danger text-danger'
      default: return 'bg-surface-variant text-text-secondary'
    }
  }

  const getAlertBarColor = (alerte: string) => {
    switch (alerte) {
      case 'vert': return 'bg-[#16A34A]'
      case 'orange': return 'bg-[#F59E0B]'
      case 'rouge': return 'bg-[#DC2626]'
      default: return 'bg-surface-tint'
    }
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {showBanner && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 text-success-dark rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">Projet créé avec succès. Saisissez vos premières opérations dans le Journal des opérations.</p>
        </div>
      )}
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-1">Budget — Consommation par ligne budgétaire</h2>
          <p className="text-base text-text-secondary">Suivi détaillé des allocations et décaissements du projet.</p>
        </div>
        <div className="flex gap-4">
          <select
            value={selectedResponsable}
            onChange={(e) => setSelectedResponsable(e.target.value)}
            className="text-sm bg-surface border border-border rounded-md px-3 py-1.5 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
          >
            <option value="Tous les responsables">Tous les responsables</option>
            {responsables.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button className="px-4 py-2 bg-surface-dim border border-border rounded-lg text-sm font-medium text-primary flex items-center gap-2 hover:bg-border transition-colors">
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Nouvelle ligne
          </button>
        </div>
      </div>

      {/* Top Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-primary">Taux de consommation total du projet</h3>
          <div className="text-3xl font-bold text-primary">
            {Math.round(totalConsumptionRate)}% <span className="text-base font-normal text-text-secondary">consommé</span>
          </div>
        </div>
        <div className="w-full bg-surface-dim h-4 rounded-full overflow-hidden">
          <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(totalConsumptionRate, 100)}%` }}></div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-text-secondary">
          <span>{formatCurrency(totalConsumed)}</span>
          <span>Budget Total: {formatCurrency(totalAllocated)}</span>
        </div>
      </div>

      {/* Funding Sources Section */}
      {fundingSources && fundingSources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fundingSources.map(fs => (
            <div key={fs.funding_source_id} className="bg-surface rounded-xl p-5 border border-border shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-semibold text-text-primary">{fs.bailleur_name}</h4>
                <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-full">
                  {Math.round(Number(fs.taux_utilisation) * 100)}% utilisé
                </span>
              </div>
              <div className="space-y-2 text-sm text-text-secondary">
                <div className="flex justify-between">
                  <span>Engagé:</span>
                  <span className="font-medium text-text-primary">{formatCurrency(Number(fs.total_engage))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Décaissé:</span>
                  <span className="font-medium text-text-primary">{formatCurrency(Number(fs.total_decaisse))}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border mt-2">
                  <span>Solde restant:</span>
                  <span className="font-bold text-primary">{formatCurrency(Number(fs.solde_restant))}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Burn Rate Chart */}
      {operations && operations.length > 0 && (
        <BurnRateChart operations={operations} />
      )}

      {/* Empty State or Data Table */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface border border-dashed border-border rounded-xl text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <WalletCards className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Aucun budget défini</h3>
          <p className="text-text-secondary max-w-md mx-auto mb-8">
            Ajoutez vos lignes budgétaires pour commencer le suivi financier de ce projet.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ajouter une ligne budgétaire
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-surface-dim border-b border-border text-text-secondary font-medium">
                <tr>
                  <th className="p-4">Ligne Budgétaire</th>
                  <th className="p-4 text-right">Budget Initial (FCFA)</th>
                  <th className="p-4 text-right">Cumul Engagé (FCFA)</th>
                  <th className="p-4 text-right">Cumul Décaissé (FCFA)</th>
                  <th className="p-4 text-right">Solde Disponible (FCFA)</th>
                  <th className="p-4 w-48">Taux de Consommation (%)</th>
                </tr>
              </thead>
              <tbody>
                {sortedKeys.map(key => {
                  const groupItems = categories[key]
                  const groupAlloc = groupItems.reduce((acc, i) => acc + Number(i.initial_allocated_amount), 0)
                  const groupEngage = groupItems.reduce((acc, i) => acc + Number(i.total_engage), 0)
                  const groupDecaisse = groupItems.reduce((acc, i) => acc + Number(i.total_decaisse), 0)
                  const groupSolde = groupAlloc - groupEngage - groupDecaisse
                  
                  return (
                    <React.Fragment key={key}>
                      <tr className="bg-slate-50 border-b border-border/50 font-bold text-text-primary">
                        <td className="p-4" colSpan={6}>{key}. Catégorie {key}</td>
                      </tr>
                      {groupItems.map((item, idx) => (
                        <tr key={item.budget_line_id} className={`border-b border-border/30 h-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                          <td className="p-4 pl-8">{item.code} {item.label}</td>
                          <td className="p-4 text-right font-mono">{formatCurrency(item.initial_allocated_amount)}</td>
                          <td className="p-4 text-right font-mono">{formatCurrency(item.total_engage)}</td>
                          <td className="p-4 text-right font-mono">{formatCurrency(item.total_decaisse)}</td>
                          <td className="p-4 text-right font-mono">{formatCurrency(item.solde_disponible)}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-surface-dim h-2 rounded-full overflow-hidden">
                                <div className={`${getAlertBarColor(item.niveau_alerte)} h-full`} style={{ width: `${Math.min(item.taux_consommation * 100, 100)}%` }}></div>
                              </div>
                              <span className={`font-mono text-xs w-10 text-right ${item.niveau_alerte === 'rouge' ? 'text-danger' : 'text-text-primary'}`}>
                                {Math.round(item.taux_consommation * 100)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-surface-dim/30 border-b-2 border-border/50 font-medium h-10">
                        <td className="p-4 text-right">Sous-total Catégorie {key}</td>
                        <td className="p-4 text-right font-mono">{formatCurrency(groupAlloc)}</td>
                        <td className="p-4 text-right font-mono">{formatCurrency(groupEngage)}</td>
                        <td className="p-4 text-right font-mono">{formatCurrency(groupDecaisse)}</td>
                        <td className="p-4 text-right font-mono">{formatCurrency(groupSolde)}</td>
                        <td className="p-4 text-right font-mono text-xs pr-6">—</td>
                      </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col p-4 gap-4 bg-background-main">
            {sortedKeys.map(key => {
              const groupItems = categories[key]
              return (
                <div key={key} className="space-y-4">
                  <h3 className="font-bold text-on-surface bg-surface-container-low p-2 rounded-lg">{key}. Catégorie {key}</h3>
                  {groupItems.map(item => (
                    <div key={item.budget_line_id} className="bg-surface p-4 rounded-xl shadow-sm border border-border">
                      <h4 className="font-semibold text-on-surface mb-2">{item.code} {item.label}</h4>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-full bg-surface-dim h-2 rounded-full overflow-hidden">
                          <div className={`${getAlertBarColor(item.niveau_alerte)} h-full`} style={{ width: `${Math.min(item.taux_consommation * 100, 100)}%` }}></div>
                        </div>
                        <span className={`font-mono text-xs font-bold ${item.niveau_alerte === 'rouge' ? 'text-danger' : 'text-primary'}`}>
                          {Math.round(item.taux_consommation * 100)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-on-surface-variant text-xs">Initial</p>
                          <p className="font-mono font-medium">{formatCurrency(item.initial_allocated_amount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-on-surface-variant text-xs">Solde</p>
                          <p className="font-mono font-bold text-primary">{formatCurrency(item.solde_disponible)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddBudgetModal 
          projectId={projectId}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
