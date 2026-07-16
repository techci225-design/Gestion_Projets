'use client'

import React, { useState } from 'react'
import { RiskItem, addRisk, updateRisk, deleteRisk } from '@/lib/actions/risks.actions'
import { Plus, Edit2, Trash2 } from 'lucide-react'

interface RisksClientProps {
  projectId: string
  initialData: RiskItem[]
}

const CATEGORIES = ['Fiduciaire', 'Opérationnel', 'Environnemental', 'Social', 'Technique', 'Politique']
const STATUSES = [
  { value: 'ouvert', label: 'Ouvert' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'clos', label: 'Clos' }
]

export function RisksClient({ projectId, initialData }: RisksClientProps) {
  const [data, setData] = useState<RiskItem[]>(initialData)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RiskItem | null>(null)
  
  const [formData, setFormData] = useState({
    category: CATEGORIES[0],
    description: '',
    probability: 1,
    impact: 1,
    mitigation_strategy: '',
    responsible: '',
    status: 'ouvert' as 'ouvert' | 'en_cours' | 'clos'
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openAddModal = () => {
    setEditingItem(null)
    setFormData({
      category: CATEGORIES[0],
      description: '',
      probability: 1,
      impact: 1,
      mitigation_strategy: '',
      responsible: '',
      status: 'ouvert'
    })
    setIsDrawerOpen(true)
  }

  const openEditModal = (item: RiskItem) => {
    setEditingItem(item)
    setFormData({
      category: item.category,
      description: item.description,
      probability: item.probability,
      impact: item.impact,
      mitigation_strategy: item.mitigation_strategy || '',
      responsible: item.responsible || '',
      status: item.status
    })
    setIsDrawerOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce risque ?')) return
    
    try {
      await deleteRisk(projectId, id)
      setData(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      alert('Erreur lors de la suppression')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const payload = {
      category: formData.category,
      description: formData.description,
      probability: formData.probability,
      impact: formData.impact,
      mitigation_strategy: formData.mitigation_strategy || null,
      responsible: formData.responsible || null,
      status: formData.status
    }

    try {
      if (editingItem) {
        const updated = await updateRisk(projectId, editingItem.id, payload)
        // Since criticality is generated, the returned 'updated' object should have it.
        // If not, we could manually compute it for UI purposes, but Supabase `select()` should return it.
        setData(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...updated } : item))
      } else {
        const created = await addRisk(projectId, payload)
        setData(prev => [created, ...prev])
      }
      setIsDrawerOpen(false)
    } catch (error) {
      alert('Erreur lors de l\'enregistrement')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCriticalityBadge = (criticality: number) => {
    if (criticality >= 6) {
      return 'bg-red-100 text-red-800 border-red-200'
    } else if (criticality >= 3) {
      return 'bg-orange-100 text-orange-800 border-orange-200'
    } else {
      return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ouvert': return 'bg-red-50 text-red-600 border-red-100'
      case 'en_cours': return 'bg-blue-50 text-blue-600 border-blue-100'
      case 'clos': return 'bg-green-50 text-green-600 border-green-100'
      default: return 'bg-gray-50 text-gray-600 border-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Registre des Risques</h2>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Déclarer un Risque
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[10%]">Catégorie</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[25%]">Description du Risque</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">P</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">I</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">Criticité</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[20%]">Stratégie d'atténuation</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Responsable</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">Statut</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-surface-hover transition-colors">
                    <td className="p-4 align-top text-sm font-medium text-text-primary">
                      {item.category}
                    </td>
                    <td className="p-4 align-top text-sm text-text-primary">
                      {item.description}
                    </td>
                    <td className="p-4 align-top text-center text-sm font-mono text-text-secondary">
                      {item.probability}
                    </td>
                    <td className="p-4 align-top text-center text-sm font-mono text-text-secondary">
                      {item.impact}
                    </td>
                    <td className="p-4 align-top text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold border ${getCriticalityBadge(item.criticality)}`}>
                        {item.criticality}
                      </span>
                    </td>
                    <td className="p-4 align-top text-sm text-text-secondary">
                      {item.mitigation_strategy || '—'}
                    </td>
                    <td className="p-4 align-top text-sm text-text-secondary">
                      {item.responsible || '—'}
                    </td>
                    <td className="p-4 align-top text-center">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(item.status)}`}>
                        {STATUSES.find(s => s.value === item.status)?.label || item.status}
                      </span>
                    </td>
                    <td className="p-4 align-top text-right">
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
                    Aucun risque enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer / Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-2xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">
                {editingItem ? 'Modifier le Risque' : 'Déclarer un Risque'}
              </h3>
              <button onClick={() => setIsDrawerOpen(false)} className="text-text-secondary hover:text-text-primary p-2">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Statut</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'ouvert' | 'en_cours' | 'clos' })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Description du Risque <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Détournement de fonds..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Probabilité (1 à 3)
                  </label>
                  <select
                    value={formData.probability}
                    onChange={e => setFormData({ ...formData, probability: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    <option value={1}>1 (Faible)</option>
                    <option value={2}>2 (Moyen)</option>
                    <option value={3}>3 (Forte)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Impact (1 à 3)
                  </label>
                  <select
                    value={formData.impact}
                    onChange={e => setFormData({ ...formData, impact: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    <option value={1}>1 (Faible)</option>
                    <option value={2}>2 (Moyen)</option>
                    <option value={3}>3 (Fort)</option>
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Stratégie d'atténuation
                  </label>
                  <textarea
                    rows={2}
                    value={formData.mitigation_strategy}
                    onChange={e => setFormData({ ...formData, mitigation_strategy: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Audits annuels, suivi strict..."
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Responsable
                  </label>
                  <input
                    type="text"
                    value={formData.responsible}
                    onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Spécialiste Financier"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-between items-center">
                <div className="text-sm">
                  Criticité calculée : <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold ml-1 ${getCriticalityBadge(formData.probability * formData.impact)}`}>{formData.probability * formData.impact}</span>
                </div>
                <div className="flex gap-3">
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
