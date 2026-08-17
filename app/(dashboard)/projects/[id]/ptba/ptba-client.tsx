'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogframeItem } from '@/lib/actions/logframe.actions'
import { PtbaActivity, addPtbaActivity, updatePtbaActivity, deletePtbaActivity } from '@/lib/actions/ptba.actions'
import { Plus, Edit2, Trash2, Check, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ImportTasksButton } from '@/components/dashboard/ImportTasksButton'
import { getDisplayCurrency } from '@/lib/utils/currency'

interface PtbaClientProps {
  projectId: string
  currentYear: number
  initialData: PtbaActivity[]
  logframeActivities: LogframeItem[]
  wbsTasks: any[]
  budgetLines: any[]
  currency?: string
}

export function PtbaClient({ projectId, currentYear, initialData, logframeActivities, wbsTasks, budgetLines, currency }: PtbaClientProps) {
  const displayCurrency = getDisplayCurrency(currency)
  const router = useRouter()
  const [data, setData] = useState<PtbaActivity[]>(initialData)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PtbaActivity | null>(null)
  
  const [formData, setFormData] = useState({
    wbs_task_id: '',
    budget_line_id: '',
    logframe_item_id: '',
    q1: false,
    q2: false,
    q3: false,
    q4: false,
    budget_planned: 0
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/projects/${projectId}/ptba?year=${e.target.value}`)
  }

  const openAddModal = () => {
    setEditingItem(null)
    setFormData({
      wbs_task_id: '',
      budget_line_id: '',
      logframe_item_id: '',
      q1: false,
      q2: false,
      q3: false,
      q4: false,
      budget_planned: 0
    })
    setIsDrawerOpen(true)
  }

  const openEditModal = (item: PtbaActivity) => {
    setEditingItem(item)
    setFormData({
      wbs_task_id: item.wbs_task_id || '',
      budget_line_id: item.budget_line_id || '',
      logframe_item_id: item.logframe_item_id || '',
      q1: item.q1,
      q2: item.q2,
      q3: item.q3,
      q4: item.q4,
      budget_planned: item.budget_planned
    })
    setIsDrawerOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette ligne du PTBA ?')) return
    
    try {
      await deletePtbaActivity(projectId, id)
      setData(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      alert('Erreur lors de la suppression')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const payload = {
      wbs_task_id: formData.wbs_task_id,
      budget_line_id: formData.budget_line_id || null,
      logframe_item_id: formData.logframe_item_id || null,
      fiscal_year: currentYear,
      q1: formData.q1,
      q2: formData.q2,
      q3: formData.q3,
      q4: formData.q4,
      budget_planned: Number(formData.budget_planned)
    }

    try {
      if (editingItem) {
        const res = await updatePtbaActivity(projectId, editingItem.id, payload)
        if (res.error) throw new Error(res.error)
        
        // Update local state with new info
        const updatedWbs = wbsTasks.find(w => w.id === formData.wbs_task_id)
        const updatedBudget = budgetLines.find(b => b.id === formData.budget_line_id)

        setData(prev => prev.map(item => item.id === editingItem.id ? { 
          ...item, 
          ...res.data,
          wbs_tasks: updatedWbs || item.wbs_tasks,
          budget_lines: updatedBudget || item.budget_lines
        } : item))
      } else {
        const res = await addPtbaActivity(projectId, payload)
        if (res.error) throw new Error(res.error)
        
        const newWbs = wbsTasks.find(w => w.id === formData.wbs_task_id)
        const newBudget = budgetLines.find(b => b.id === formData.budget_line_id)
        
        setData(prev => [...prev, {
          ...res.data,
          wbs_tasks: newWbs,
          budget_lines: newBudget
        }])
      }
      setIsDrawerOpen(false)
    } catch (error: any) {
      alert(error.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalBudget = data.reduce((acc, curr) => acc + Number(curr.budget_planned), 0)

  // Generate an array of years from 2010 to 2030
  const years = Array.from({ length: 21 }, (_, i) => 2010 + i)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="year-select" className="text-sm font-medium text-text-secondary">Exercice :</label>
          <div className="relative">
            <select
              id="year-select"
              value={currentYear}
              onChange={handleYearChange}
              className="appearance-none bg-surface border border-border rounded-lg pl-4 pr-10 py-2 text-text-primary focus:outline-none focus:border-blue-500 font-medium"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-text-secondary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ImportTasksButton projectId={projectId} />
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Programmer une Activité
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[10%]">Code WBS</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[25%]">Activité</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[15%]">Ligne Budgétaire</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">Q1</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">Q2</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">Q3</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">Q4</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right w-[15%]">Budget Prévu</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-surface-hover transition-colors">
                    <td className="p-4 text-sm font-medium text-text-primary align-middle">
                      {item.wbs_tasks?.code || item.code}
                    </td>
                    <td className="p-4 text-sm align-middle">
                      <p className="text-text-primary font-medium">{item.wbs_tasks?.name || item.description}</p>
                      {item.logframe_items?.intervention_label && (
                        <p className="text-xs text-text-secondary mt-1">Lien: {item.logframe_items.intervention_label}</p>
                      )}
                    </td>
                    <td className="p-4 text-sm text-text-secondary align-middle">
                      {item.budget_lines?.code ? `${item.budget_lines.code} - ${item.budget_lines.label}` : '—'}
                    </td>
                    <td className="p-4 align-middle text-center">
                      {item.q1 ? <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center mx-auto text-green-700"><Check className="w-4 h-4"/></div> : <span className="text-border">—</span>}
                    </td>
                    <td className="p-4 align-middle text-center">
                      {item.q2 ? <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center mx-auto text-green-700"><Check className="w-4 h-4"/></div> : <span className="text-border">—</span>}
                    </td>
                    <td className="p-4 align-middle text-center">
                      {item.q3 ? <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center mx-auto text-green-700"><Check className="w-4 h-4"/></div> : <span className="text-border">—</span>}
                    </td>
                    <td className="p-4 align-middle text-center">
                      {item.q4 ? <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center mx-auto text-green-700"><Check className="w-4 h-4"/></div> : <span className="text-border">—</span>}
                    </td>
                    <td className="p-4 text-sm text-right font-mono font-medium text-text-primary align-middle">
                      {formatCurrency(item.budget_planned)}
                    </td>
                    <td className="p-4 text-right align-middle">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditModal(item)} className="p-1.5 text-text-secondary hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Modifier">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-text-secondary">
                    Aucune ligne au PTBA pour cet exercice.
                  </td>
                </tr>
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot className="bg-background border-t-2 border-border font-semibold">
                <tr>
                  <td colSpan={7} className="p-4 text-right text-text-primary">
                    Total Budget PTBA {currentYear} :
                  </td>
                  <td className="p-4 text-right font-mono text-text-primary">
                    {formatCurrency(totalBudget)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Drawer / Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-2xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">
                {editingItem ? 'Modifier la programmation' : `Programmer une activité WBS pour ${currentYear}`}
              </h3>
              <button onClick={() => setIsDrawerOpen(false)} className="text-text-secondary hover:text-text-primary p-2">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
              
              <div className="grid grid-cols-1 gap-6">
                
                {/* 1. Sélection de la tâche WBS */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Activité WBS à programmer <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    disabled={!!editingItem} // Ne pas changer la tâche WBS une fois programmée
                    value={formData.wbs_task_id}
                    onChange={e => setFormData({ ...formData, wbs_task_id: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">-- Sélectionner une activité --</option>
                    {wbsTasks.map(wbs => (
                      <option key={wbs.id} value={wbs.id}>
                        {wbs.code} - {wbs.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Sélection de la Ligne Budgétaire */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Ligne Budgétaire (Financement)
                  </label>
                  <select
                    value={formData.budget_line_id}
                    onChange={e => setFormData({ ...formData, budget_line_id: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Non rattaché --</option>
                    {budgetLines.map(bl => (
                      <option key={bl.id} value={bl.id}>
                        {bl.code} - {bl.label} (Alloué: {formatCurrency(bl.initial_allocated_amount)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Optionnel: Cadre Logique */}
                {logframeActivities.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Lien avec le Cadre Logique (Optionnel)
                    </label>
                    <select
                      value={formData.logframe_item_id}
                      onChange={e => setFormData({ ...formData, logframe_item_id: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Indépendant --</option>
                      {logframeActivities.map(l => (
                        <option key={l.id} value={l.id}>{l.intervention_label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 4. Budget Prévu */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Budget Prévu pour {currentYear} ({displayCurrency}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={formData.budget_planned || ''}
                    onChange={e => setFormData({ ...formData, budget_planned: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                    placeholder="0"
                  />
                  {formData.wbs_task_id && (
                    <p className="text-xs text-text-secondary mt-1">
                      Rappel: Le budget total de l'activité WBS est de {formatCurrency(wbsTasks.find(w => w.id === formData.wbs_task_id)?.budget_allocated || 0)}
                    </p>
                  )}
                </div>

                {/* 5. Planification Trimestrielle */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">
                    Planification Trimestrielle
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.q1} onChange={e => setFormData({...formData, q1: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-border focus:ring-blue-500" />
                      <span className="text-sm font-medium text-text-primary">Q1 (Jan-Mar)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.q2} onChange={e => setFormData({...formData, q2: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-border focus:ring-blue-500" />
                      <span className="text-sm font-medium text-text-primary">Q2 (Avr-Juin)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.q3} onChange={e => setFormData({...formData, q3: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-border focus:ring-blue-500" />
                      <span className="text-sm font-medium text-text-primary">Q3 (Juil-Sep)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.q4} onChange={e => setFormData({...formData, q4: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-border focus:ring-blue-500" />
                      <span className="text-sm font-medium text-text-primary">Q4 (Oct-Déc)</span>
                    </label>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary bg-background border border-border rounded-lg hover:bg-surface-hover transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
