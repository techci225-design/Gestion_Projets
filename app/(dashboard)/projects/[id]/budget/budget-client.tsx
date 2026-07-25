'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Download, CheckCircle2, WalletCards, Trash2, AlertTriangle, Pencil } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddBudgetModal } from './add-budget-modal'
import { EditBudgetModal } from './edit-budget-modal'
import { BurnRateChart } from '@/components/dashboard/BurnRateChart'
import { useSearchParams, useRouter } from 'next/navigation'
import { deleteBudgetLine } from '@/lib/actions/budget.actions'

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
  unit?: string
  quantity?: number
  unit_cost?: number
  funding_source_id?: string
}

export function BudgetClient({ items, fundingSources, operations, objectifsSpecifiques = [], projectId, currency = 'FCFA', isNewProject }: { items: BudgetConsumption[], fundingSources?: any[], operations?: any[], objectifsSpecifiques?: string[], projectId: string, currency?: string, isNewProject?: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBudgetLine, setEditingBudgetLine] = useState<BudgetConsumption | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showBanner, setShowBanner] = useState(isNewProject)
  const [selectedResponsable, setSelectedResponsable] = useState('Tous les responsables')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
  const handleDelete = async (budgetId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette ligne budgétaire ?')) return
    setIsDeleting(budgetId)
    const res = await deleteBudgetLine(projectId, budgetId)
    setIsDeleting(null)
    if (res?.error) {
      alert(res.error)
    }
  }

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
    <div className="flex flex-col space-y-6">
      {showBanner && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 text-success-dark rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">Projet créé avec succès. Saisissez vos premières opérations dans le Journal des opérations.</p>
        </div>
      )}
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-1">Budget — Consommation par ligne budgétaire</h2>
          <p className="text-sm md:text-base text-text-secondary">Suivi détaillé des allocations et décaissements du projet.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
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

      {/* Strategic Financial Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-text-secondary">Budget Total</p>
          <p className="text-2xl font-bold text-primary mt-2">{formatCurrency(totalAllocated, currency).replace(currency, '')}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-text-secondary">Réalisé (Décaissé)</p>
            <span className="bg-success/10 text-success-dark text-xs font-bold px-2 py-1 rounded">{totalAllocated > 0 ? Math.round((totalDecaisse / totalAllocated) * 100) : 0}%</span>
          </div>
          <p className="text-2xl font-bold text-success-dark mt-2">{formatCurrency(totalDecaisse, currency).replace(currency, '')}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-text-secondary">Engagé (En cours)</p>
            <span className="bg-warning/20 text-warning-dark text-xs font-bold px-2 py-1 rounded">{totalAllocated > 0 ? Math.round((totalEngage / totalAllocated) * 100) : 0}%</span>
          </div>
          <p className="text-2xl font-bold text-warning-dark mt-2">{formatCurrency(totalEngage, currency).replace(currency, '')}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-text-secondary">Reste à décaisser (Solde)</p>
            <span className="bg-surface-variant text-text-secondary text-xs font-bold px-2 py-1 rounded">{totalAllocated > 0 ? Math.round(((totalAllocated - totalConsumed) / totalAllocated) * 100) : 0}%</span>
          </div>
          <p className="text-2xl font-bold text-primary/80 mt-2">{formatCurrency(totalAllocated - totalConsumed, currency).replace(currency, '')}</p>
        </div>
      </div>

      {/* Visual Progress Bar Segmented */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Répartition de l'exécution budgétaire (Réalisé / Engagé / Reste)</h3>
        <div className="w-full bg-surface-dim h-6 rounded-full overflow-hidden flex border border-border/50">
          <div className="bg-success h-full transition-all duration-500" style={{ width: `${totalAllocated > 0 ? (totalDecaisse / totalAllocated) * 100 : 0}%` }} title={`Réalisé: ${formatCurrency(totalDecaisse, currency)}`}></div>
          <div className="bg-warning h-full transition-all duration-500" style={{ width: `${totalAllocated > 0 ? (totalEngage / totalAllocated) * 100 : 0}%` }} title={`Engagé: ${formatCurrency(totalEngage, currency)}`}></div>
        </div>
        <div className="flex items-center gap-6 mt-4 text-xs font-medium">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span className="text-text-secondary">Réalisé ({totalAllocated > 0 ? Math.round((totalDecaisse / totalAllocated) * 100) : 0}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <span className="text-text-secondary">Engagé ({totalAllocated > 0 ? Math.round((totalEngage / totalAllocated) * 100) : 0}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-surface-dim border border-border"></div>
            <span className="text-text-secondary">Reste ({totalAllocated > 0 ? Math.round(((totalAllocated - totalConsumed) / totalAllocated) * 100) : 0}%)</span>
          </div>
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
              <thead className="bg-primary/5 border-b border-border text-primary font-bold">
                <tr>
                  <th className="p-4 uppercase text-xs tracking-wider">Code</th>
                  <th className="p-4 uppercase text-xs tracking-wider">Rubrique Budgétaire</th>
                  <th className="p-4 uppercase text-xs tracking-wider text-center">Unité</th>
                  <th className="p-4 uppercase text-xs tracking-wider text-right">Quantité</th>
                  <th className="p-4 uppercase text-xs tracking-wider text-right">Coût unitaire ({currency})</th>
                  <th className="p-4 uppercase text-xs tracking-wider text-right">Coût Total ({currency})</th>
                  <th className="p-4 uppercase text-xs tracking-wider text-right">Financement Bailleur ({currency})</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {sortedKeys.map(key => {
                  const groupItems = categories[key]
                  const groupAlloc = groupItems.reduce((acc, i) => acc + Number(i.initial_allocated_amount), 0)
                  
                  // Compute objective name based on key (e.g. key "1" -> Objectif index 0)
                  const objIndex = parseInt(key) - 1
                  const objectifName = (!isNaN(objIndex) && objIndex >= 0 && objIndex < objectifsSpecifiques.length) 
                    ? objectifsSpecifiques[objIndex] 
                    : `Catégorie ${key}`
                  
                  return (
                    <React.Fragment key={key}>
                      <tr className="bg-primary/10 border-b border-border/50 font-bold text-primary">
                        <td className="p-4 text-center">{key}</td>
                        <td className="p-4 uppercase" colSpan={4}>{key}. {objectifName}</td>
                        <td className="p-4 text-right">{formatCurrency(groupAlloc).replace('FCFA', '')}</td>
                        <td className="p-4 text-right">{formatCurrency(groupAlloc).replace('FCFA', '')}</td>
                        <td className="p-4"></td>
                      </tr>
                      {groupItems.map((item, idx) => (
                        <tr key={item.budget_line_id} className={`border-b border-border/30 h-10 hover:bg-slate-50 transition-colors`}>
                          <td className="p-4 text-center font-medium text-text-secondary">{item.code}</td>
                          <td className="p-4">{item.label}</td>
                          <td className="p-4 text-center text-text-secondary">{item.unit || '-'}</td>
                          <td className="p-4 text-right font-mono text-text-secondary">{item.quantity || '-'}</td>
                          <td className="p-4 text-right font-mono text-text-secondary">{item.unit_cost ? formatCurrency(item.unit_cost, currency).replace(currency, '') : '-'}</td>
                          <td className="p-4 text-right font-mono font-medium">{formatCurrency(item.initial_allocated_amount, currency).replace(currency, '')}</td>
                          <td className="p-4 text-right font-mono text-primary/80">{formatCurrency(item.initial_allocated_amount, currency).replace(currency, '')}</td>
                          <td className="p-4 text-right flex items-center justify-end gap-1">
                            <button 
                              onClick={() => setEditingBudgetLine(item)}
                              className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Modifier la ligne"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(item.budget_line_id)}
                              disabled={isDeleting === item.budget_line_id}
                              className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                              title="Supprimer la ligne"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </tbody>
              <tfoot className="bg-surface-dim font-bold text-primary">
                <tr>
                  <td className="p-4" colSpan={5}>TOTAL GÉNÉRAL:</td>
                  <td className="p-4 text-right text-lg">{formatCurrency(totalAllocated, currency).replace(currency, '')}</td>
                  <td className="p-4 text-right text-lg">{formatCurrency(totalAllocated, currency).replace(currency, '')}</td>
                  <td className="p-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col p-4 gap-4 bg-background-main">
            {sortedKeys.map(key => {
              const groupItems = categories[key]
              return (
                <div key={key} className="space-y-4">
                  <h3 className="font-bold text-on-surface bg-primary/10 text-primary p-3 rounded-lg">
                    {key}. {(() => {
                      const objIndex = parseInt(key) - 1
                      return (!isNaN(objIndex) && objIndex >= 0 && objIndex < objectifsSpecifiques.length) 
                        ? objectifsSpecifiques[objIndex] 
                        : `Catégorie ${key}`
                    })()}
                  </h3>
                  {groupItems.map(item => (
                    <div key={item.budget_line_id} className="bg-surface p-4 rounded-xl shadow-sm border border-border">
                      <h4 className="font-semibold text-text-primary mb-3">{item.code} {item.label}</h4>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4">
                        <div>
                          <p className="text-text-secondary text-xs">Unité / Qté</p>
                          <p className="font-medium text-text-primary">{item.unit || '-'} ({item.quantity || '-'})</p>
                        </div>
                        <div className="text-right">
                          <p className="text-text-secondary text-xs">Coût unitaire ({currency})</p>
                          <p className="font-mono text-text-primary">{item.unit_cost ? formatCurrency(item.unit_cost, currency).replace(currency, '') : '-'}</p>
                        </div>
                        <div>
                          <p className="text-text-secondary text-xs">Financement ({currency})</p>
                          <p className="font-mono font-medium text-primary/80">{formatCurrency(item.initial_allocated_amount, currency).replace(currency, '')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-text-secondary text-xs">Coût Total ({currency})</p>
                          <p className="font-mono font-bold text-text-primary">{formatCurrency(item.initial_allocated_amount, currency).replace(currency, '')}</p>
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
          currency={currency}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {editingBudgetLine && (
        <EditBudgetModal
          projectId={projectId}
          currency={currency}
          budgetLine={editingBudgetLine}
          onClose={() => setEditingBudgetLine(null)}
        />
      )}
    </div>
  )
}
