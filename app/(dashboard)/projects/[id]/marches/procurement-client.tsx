'use client'

import React, { useState } from 'react'
import { ProcurementItem, addProcurement, updateProcurement, deleteProcurement } from '@/lib/actions/procurement.actions'
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ProcurementClientProps {
  projectId: string
  initialData: ProcurementItem[]
}

const MARKET_TYPES = ['Travaux', 'Biens', 'Services de Consultants', 'Services Autres']
const METHODS = ['AOI (Appel d\'Offres International)', 'AON (Appel d\'Offres National)', 'SFQC (Sélection Fondée sur la Qualité et Coût)', 'SMC (Sélection Moindre Coût)', 'Entente Directe']
const STATUSES = ['Planifié', 'En cours', 'Attribué', 'Annulé']

export function ProcurementClient({ projectId, initialData }: ProcurementClientProps) {
  const [data, setData] = useState<ProcurementItem[]>(initialData)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ProcurementItem | null>(null)
  
  const [formData, setFormData] = useState({
    description: '',
    market_type: MARKET_TYPES[0],
    method: METHODS[0],
    review_type: 'a_priori' as 'a_priori' | 'a_posteriori',
    planned_notice_date: '',
    contract_signature_date: '',
    estimated_amount: 0,
    status: STATUSES[0]
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openAddModal = () => {
    setEditingItem(null)
    setFormData({
      description: '',
      market_type: MARKET_TYPES[0],
      method: METHODS[0],
      review_type: 'a_priori',
      planned_notice_date: '',
      contract_signature_date: '',
      estimated_amount: 0,
      status: STATUSES[0]
    })
    setIsDrawerOpen(true)
  }

  const openEditModal = (item: ProcurementItem) => {
    setEditingItem(item)
    setFormData({
      description: item.description,
      market_type: item.market_type || MARKET_TYPES[0],
      method: item.method || METHODS[0],
      review_type: item.review_type || 'a_priori',
      planned_notice_date: item.planned_notice_date ? item.planned_notice_date.split('T')[0] : '',
      contract_signature_date: item.contract_signature_date ? item.contract_signature_date.split('T')[0] : '',
      estimated_amount: item.estimated_amount || 0,
      status: item.status || STATUSES[0]
    })
    setIsDrawerOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce marché du plan ?')) return
    
    try {
      await deleteProcurement(projectId, id)
      setData(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      alert('Erreur lors de la suppression')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const payload = {
      description: formData.description,
      market_type: formData.market_type,
      method: formData.method,
      review_type: formData.review_type,
      planned_notice_date: formData.planned_notice_date || null,
      contract_signature_date: formData.contract_signature_date || null,
      estimated_amount: Number(formData.estimated_amount),
      status: formData.status
    }

    try {
      if (editingItem) {
        const updated = await updateProcurement(projectId, editingItem.id, payload)
        setData(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...updated } : item))
      } else {
        const created = await addProcurement(projectId, payload)
        setData(prev => [created, ...prev])
      }
      setIsDrawerOpen(false)
    } catch (error) {
      alert('Erreur lors de l\'enregistrement')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return format(parseISO(dateStr), 'dd MMM yyyy', { locale: fr })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planifié': return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'En cours': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'Attribué': return 'bg-green-100 text-green-700 border-green-200'
      case 'Annulé': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const totalEstimated = data.reduce((acc, curr) => acc + Number(curr.estimated_amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Liste des Marchés Planifiés</h2>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau Marché
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[25%]">Description du Marché</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Type & Méthode</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">Revue</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Calendrier</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Statut</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Montant Estimé</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-surface-hover transition-colors">
                    <td className="p-4 align-top">
                      <p className="text-sm font-medium text-text-primary">{item.description}</p>
                    </td>
                    <td className="p-4 align-top">
                      <p className="text-sm text-text-primary font-medium">{item.market_type}</p>
                      <p className="text-xs text-text-secondary">{item.method?.split('(')[0]}</p>
                    </td>
                    <td className="p-4 align-top text-center">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${
                        item.review_type === 'a_priori' 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {item.review_type === 'a_priori' ? 'A priori' : 'A posteriori'}
                      </span>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex flex-col gap-1 text-xs text-text-secondary">
                        <div className="flex items-center gap-1" title="Date d'Avis">
                          <Calendar className="w-3.5 h-3.5" /> <span>Avis : {formatDate(item.planned_notice_date)}</span>
                        </div>
                        <div className="flex items-center gap-1 font-medium text-text-primary" title="Signature Contrat">
                          <Calendar className="w-3.5 h-3.5" /> <span>Sign. : {formatDate(item.contract_signature_date)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 align-top text-right font-mono font-medium text-text-primary">
                      {formatCurrency(item.estimated_amount || 0)}
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
                  <td colSpan={7} className="p-8 text-center text-text-secondary">
                    Aucun marché dans le plan de passation.
                  </td>
                </tr>
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot className="bg-background border-t-2 border-border font-semibold">
                <tr>
                  <td colSpan={5} className="p-4 text-right text-text-primary">
                    Total Estimé du PPM :
                  </td>
                  <td className="p-4 text-right font-mono text-text-primary">
                    {formatCurrency(totalEstimated)}
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
                {editingItem ? 'Modifier le Marché' : 'Nouveau Marché'}
              </h3>
              <button onClick={() => setIsDrawerOpen(false)} className="text-text-secondary hover:text-text-primary p-2">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description du Marché <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Construction de 50 forages..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Type de Marché</label>
                  <select
                    value={formData.market_type}
                    onChange={e => setFormData({ ...formData, market_type: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    {MARKET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Méthode de sélection</label>
                  <select
                    value={formData.method}
                    onChange={e => setFormData({ ...formData, method: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Revue (Bailleur)</label>
                  <select
                    value={formData.review_type}
                    onChange={e => setFormData({ ...formData, review_type: e.target.value as 'a_priori' | 'a_posteriori' })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    <option value="a_priori">A priori</option>
                    <option value="a_posteriori">A posteriori</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Statut du marché</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Date prévue Avis
                  </label>
                  <input
                    type="date"
                    value={formData.planned_notice_date}
                    onChange={e => setFormData({ ...formData, planned_notice_date: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Date signature contrat
                  </label>
                  <input
                    type="date"
                    value={formData.contract_signature_date}
                    onChange={e => setFormData({ ...formData, contract_signature_date: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Montant Estimé (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={formData.estimated_amount || ''}
                    onChange={e => setFormData({ ...formData, estimated_amount: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500 text-xl font-mono"
                    placeholder="0"
                  />
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
