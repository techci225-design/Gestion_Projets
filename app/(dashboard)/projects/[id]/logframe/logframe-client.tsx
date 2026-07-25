'use client'

import React, { useState } from 'react'
import { LogframeItem, LogframeLevel, addLogframeItem, updateLogframeItem, deleteLogframeItem } from '@/lib/actions/logframe.actions'
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

interface LogframeClientProps {
  projectId: string
  initialData: LogframeItem[]
}

const levelLabels: Record<LogframeLevel, string> = {
  objectif_global: 'Objectif Global (Impact)',
  objectif_specifique: 'Objectif Spécifique (Effet)',
  resultat: 'Résultat (Extrant)',
  activite: 'Activité'
}

const levelColors: Record<LogframeLevel, { bg: string, text: string, border: string }> = {
  objectif_global: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  objectif_specifique: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  resultat: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  activite: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
}

const placeholders: Record<LogframeLevel, any> = {
  objectif_global: {
    description: "Ex: Améliorer l'offre et la qualité des services éducatifs...",
    indicator: "Ex: 80% des élèves passent les tests finaux...",
    baseline: "Ex: Données manquantes (post-séisme)",
    target: "Ex: 80% à fin du projet",
    source: "Ex: Dossiers étudiants, Notes d'élèves...",
    risks: "Ex: -"
  },
  objectif_specifique: {
    description: "Ex: Fourniture d'infrastructures d'éducation de qualité...",
    indicator: "Ex: 30 nouvelles écoles en fonctionnement qui répondent aux normes...",
    baseline: "Ex: 0 école en fonctionnement",
    target: "Ex: 30 écoles opérationnelles",
    source: "Ex: Rapports semestriels des consultants...",
    risks: "Ex: Il existe une révision permanente des politiques..."
  },
  resultat: {
    description: "Ex: 30 écoles construites, 30 écoles équipées...",
    indicator: "Ex: 30 écoles construites, équipées et avec contrat...",
    baseline: "Ex: 0",
    target: "Ex: 30 écoles à S4",
    source: "Ex: Rapport d'un consultant ou ingénieur...",
    risks: "Ex: Le matériel et le mobilier sont affectés aux classes..."
  },
  activite: {
    description: "Ex: Lancement des appels d'offres...",
    indicator: "Ex: Nombre d'appels d'offres lancés",
    baseline: "Ex: 0",
    target: "Ex: 3",
    source: "Ex: Dossiers d'appels d'offres",
    risks: "Ex: Retards dans le processus..."
  }
}


const nextLevel: Record<LogframeLevel, LogframeLevel | null> = {
  objectif_global: 'objectif_specifique',
  objectif_specifique: 'resultat',
  resultat: 'activite',
  activite: null
}

export function LogframeClient({ projectId, initialData }: LogframeClientProps) {
  const [activeTab, setActiveTab] = useState<'planification' | 'suivi'>('planification')
  const [data, setData] = useState<LogframeItem[]>(initialData)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LogframeItem | null>(null)
  
  // Modal state for adding a child
  const [parentForNew, setParentForNew] = useState<{ id: string | null, level: LogframeLevel } | null>(null)

  const [formData, setFormData] = useState({
    intervention_label: '',
    indicator: '',
    baseline: '',
    target: '',
    verification_source: '',
    risks_assumptions: '',
    s1_value: '',
    s2_value: '',
    s3_value: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Expanded rows state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(initialData.map(i => i.id)))

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const openAddModal = (parentId: string | null = null, level: LogframeLevel = 'objectif_global') => {
    setParentForNew({ id: parentId, level })
    setEditingItem(null)
    setFormData({
      intervention_label: '', indicator: '', baseline: '', target: '', verification_source: '', risks_assumptions: '', s1_value: '', s2_value: '', s3_value: ''
    })
    setIsDrawerOpen(true)
  }

  const openEditModal = (item: LogframeItem) => {
    setEditingItem(item)
    setParentForNew(null)
    setFormData({
      intervention_label: item.intervention_label,
      indicator: item.indicator || '',
      baseline: item.baseline || '',
      target: item.target || '',
      verification_source: item.verification_source || '',
      risks_assumptions: item.risks_assumptions || '',
      s1_value: item.s1_value || '',
      s2_value: item.s2_value || '',
      s3_value: item.s3_value || ''
    })
    setIsDrawerOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ? Cela supprimera également tous ses sous-éléments.')) return
    
    try {
      await deleteLogframeItem(projectId, id)
      // Update local state by removing the item and its children
      // For simplicity, we just trigger a hard refresh or we can filter locally. Let's filter locally.
      // Actually, since deleteLogframeItem calls revalidatePath, in a real scenario we might just want to 
      // rely on server refresh, but here we can manually update:
      const idsToRemove = new Set<string>()
      
      const collectIdsToRemove = (parentId: string) => {
        idsToRemove.add(parentId)
        data.filter(item => item.parent_id === parentId).forEach(child => collectIdsToRemove(child.id))
      }
      collectIdsToRemove(id)
      
      setData(prev => prev.filter(item => !idsToRemove.has(item.id)))
    } catch (error) {
      alert('Erreur lors de la suppression')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (editingItem) {
        const updated = await updateLogframeItem(projectId, editingItem.id, {
          intervention_label: formData.intervention_label,
          indicator: formData.indicator || null,
          baseline: formData.baseline || null,
          target: formData.target || null,
          verification_source: formData.verification_source || null,
          risks_assumptions: formData.risks_assumptions || null,
          s1_value: formData.s1_value || null,
          s2_value: formData.s2_value || null,
          s3_value: formData.s3_value || null,
        })
        setData(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...updated } : item))
      } else if (parentForNew) {
        const created = await addLogframeItem(projectId, {
          parent_id: parentForNew.id,
          level: parentForNew.level,
          intervention_label: formData.intervention_label,
          indicator: formData.indicator || null,
          baseline: formData.baseline || null,
          target: formData.target || null,
          verification_source: formData.verification_source || null,
          risks_assumptions: formData.risks_assumptions || null,
          s1_value: formData.s1_value || null,
          s2_value: formData.s2_value || null,
          s3_value: formData.s3_value || null,
        })
        setData(prev => [...prev, created])
      }
      setIsDrawerOpen(false)
    } catch (error) {
      alert('Erreur lors de l\'enregistrement')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Recursive rendering of the tree
  const renderRows = (parentId: string | null = null, depth: number = 0) => {
    const children = data.filter(item => item.parent_id === parentId)
    
    if (children.length === 0) return null

    return children.map(item => {
      const hasChildren = data.some(child => child.parent_id === item.id)
      const isExpanded = expandedIds.has(item.id)
      const colors = levelColors[item.level]

      return (
        <React.Fragment key={item.id}>
          <tr className={`border-b border-border hover:bg-surface-hover transition-colors ${depth === 0 ? 'bg-surface' : ''}`}>
            <td className="p-4 align-top" style={{ paddingLeft: `${Math.max(1, depth * 2.5)}rem` }}>
              <div className="flex items-start gap-2">
                {hasChildren ? (
                  <button onClick={() => toggleExpand(item.id)} className="mt-1 text-text-secondary hover:text-text-primary">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                ) : (
                  <span className="w-4 h-4 block" />
                )}
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border mb-1 ${colors.bg} ${colors.text} ${colors.border}`}>
                    {levelLabels[item.level]}
                  </span>
                  <p className="text-sm font-medium text-text-primary leading-tight">{item.intervention_label}</p>
                </div>
              </div>
            </td>
            <td className="p-4 align-top text-sm text-text-secondary">{item.indicator || '—'}</td>
            <td className="p-4 align-top text-sm text-text-secondary">{item.baseline || '—'}</td>
            <td className="p-4 align-top text-sm text-text-secondary">{item.target || '—'}</td>
            <td className="p-4 align-top text-sm text-text-secondary">{item.verification_source || '—'}</td>
            <td className="p-4 align-top text-sm text-text-secondary">{item.risks_assumptions || '—'}</td>
            <td className="p-4 align-top text-right">
              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Reveal actions on hover, actually let's just show them always for mobile friendliness or use a dropdown */}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(item)} className="p-1.5 text-text-secondary hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Modifier">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {nextLevel[item.level] && (
                  <button 
                    onClick={() => openAddModal(item.id, nextLevel[item.level] as LogframeLevel)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Ajouter {levelLabels[nextLevel[item.level] as LogframeLevel]}
                  </button>
                )}
              </div>
            </td>
          </tr>
          {isExpanded && renderRows(item.id, depth + 1)}
        </React.Fragment>
      )
    })
  }

  const currentLevel = parentForNew ? parentForNew.level : (editingItem ? editingItem.level : 'objectif_global')

  return (
    <div className="space-y-6">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('planification')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'planification'
                ? 'text-blue-600'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Cadre Logique (Planification)
            {activeTab === 'planification' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('suivi')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'suivi'
                ? 'text-blue-600'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Composante / Résultat (Suivi semestriel)
            {activeTab === 'suivi' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
            )}
          </button>
        </div>
        {activeTab === 'planification' && (
          <button
            onClick={() => openAddModal(null, 'objectif_global')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvel Objectif Global
          </button>
        )}
      </div>

      {activeTab === 'planification' && (
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[25%]">Description du projet</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[15%]">Indicateurs (IOV)</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[10%]">Ligne de base</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[10%]">Cible visée</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[15%]">Source de vérification</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[15%]">Hypothèses & Risques</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[10%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.filter(item => item.parent_id === null).length > 0 ? (
                  renderRows(null, 0)
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-secondary">
                      Le cadre logique est vide. Commencez par ajouter un Objectif Global.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'suivi' && (
        <div className="border border-blue-900 rounded-sm overflow-hidden bg-white">
          <div className="bg-[#1e3a6a] text-white text-center font-bold py-2 text-sm uppercase tracking-wide">
            COMPOSANTE / RÉSULTAT
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#3b82f6] text-white">
                <tr>
                  <th className="p-3 font-semibold border-r border-blue-400 w-[30%]">Composante / Résultat</th>
                  <th className="p-3 font-semibold text-center border-r border-blue-400">Base (départ)</th>
                  <th className="p-3 font-semibold text-center border-r border-blue-400">S 1</th>
                  <th className="p-3 font-semibold text-center border-r border-blue-400">S 2</th>
                  <th className="p-3 font-semibold text-center border-r border-blue-400">S 3</th>
                  <th className="p-3 font-semibold text-center">S 4 (But final)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const renderSuiviRows = (parentId: string | null = null, depth: number = 0) => {
                    const children = data.filter(item => item.parent_id === parentId && item.level !== 'activite')
                    
                    if (children.length === 0) return null

                    return children.map(ind => {
                      const isTopLevel = ind.level === 'objectif_global'
                      const isMidLevel = ind.level === 'objectif_specifique'

                      // Don't render Objectif Global row in Suivi tab, just its children
                      if (isTopLevel) {
                        return (
                          <React.Fragment key={ind.id}>
                            {renderSuiviRows(ind.id, depth)}
                          </React.Fragment>
                        )
                      }

                      // ALWAYS render mid level items as full-width section headers in the Suivi tab
                      if (isMidLevel) {
                        return (
                          <React.Fragment key={ind.id}>
                            <tr className="border-b border-blue-200 bg-[#eff6ff]">
                              <td colSpan={6} className="p-3" style={{ paddingLeft: `${Math.max(0.75, depth * 1.5)}rem` }}>
                                <div className="flex items-center justify-between group">
                                  <div className="font-bold text-blue-900">
                                    {ind.intervention_label}
                                  </div>
                                  <div className="flex items-center">
                                    <button onClick={() => openEditModal(ind)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded ml-2" title="Modifier">
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    {nextLevel[ind.level] && nextLevel[ind.level] !== 'activite' && (
                                      <button 
                                        onClick={() => openAddModal(ind.id, nextLevel[ind.level] as LogframeLevel)}
                                        className="text-[10px] font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-100 px-2 py-1.5 rounded flex items-center gap-1 ml-1"
                                      >
                                        <Plus className="w-3 h-3" /> Ajouter
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {renderSuiviRows(ind.id, depth + 1)}
                          </React.Fragment>
                        )
                      }

                      // Otherwise render as a normal tracking row with columns (Résultats)
                      return (
                        <React.Fragment key={ind.id}>
                          <tr className="border-b border-blue-100 hover:bg-slate-50 transition-colors bg-white">
                            <td className="p-3 border-r border-blue-100" style={{ paddingLeft: `${Math.max(0.75, depth * 1.5)}rem` }}>
                              <div className="flex items-start justify-between group">
                                <div>
                                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-blue-600">{levelLabels[ind.level]}</div>
                                  <div className="font-medium text-text-primary">{ind.intervention_label}</div>
                                </div>
                                <div className="flex flex-col items-end ml-2">
                                  <button onClick={() => openEditModal(ind)} className="p-1.5 text-blue-600 hover:bg-blue-50 bg-white/50 rounded" title="Saisir les données de suivi">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center border-r border-blue-100 text-text-secondary">{ind.baseline || '0'}</td>
                            <td className="p-3 text-center border-r border-blue-100 font-medium text-text-primary">{ind.s1_value || '—'}</td>
                            <td className="p-3 text-center border-r border-blue-100 font-medium text-text-primary">{ind.s2_value || '—'}</td>
                            <td className="p-3 text-center border-r border-blue-100 font-medium text-text-primary">{ind.s3_value || '—'}</td>
                            <td className="p-3 text-center text-text-secondary font-bold">{ind.target || '—'}</td>
                          </tr>
                          {renderSuiviRows(ind.id, depth + 1)}
                        </React.Fragment>
                      )
                    })
                  }

                  const rootItems = data.filter(item => item.parent_id === null && item.level !== 'activite')
                  if (rootItems.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-text-secondary">
                          Aucun résultat, objectif spécifique ou objectif global à afficher dans la matrice.<br/>
                          <span className="text-xs italic">(Note: Les activités sont suivies dans le PTBA)</span>
                        </td>
                      </tr>
                    )
                  }
                  return renderSuiviRows(null, 0)
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer / Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-2xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">
                {editingItem ? 'Modifier l\'élément' : `Ajouter : ${parentForNew ? levelLabels[parentForNew.level] : 'Objectif Global'}`}
              </h3>
              <button onClick={() => setIsDrawerOpen(false)} className="text-text-secondary hover:text-text-primary p-2">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="space-y-4">
                {(activeTab === 'planification' || !isEditing) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Description du projet <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={formData.intervention_label}
                        onChange={e => setFormData({ ...formData, intervention_label: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                        placeholder={placeholders[currentLevel]?.description || "Description..."}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Indicateur (IOV)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.indicator}
                        onChange={e => setFormData({ ...formData, indicator: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                        placeholder={placeholders[currentLevel]?.indicator || "Ex: Taux de réussite..."}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Ligne de base
                      </label>
                      <input
                        type="text"
                        value={formData.baseline}
                        onChange={e => setFormData({ ...formData, baseline: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                        placeholder={placeholders[currentLevel]?.baseline || "Ligne de base..."}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Cible visée
                      </label>
                      <input
                        type="text"
                        value={formData.target}
                        onChange={e => setFormData({ ...formData, target: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                        placeholder={placeholders[currentLevel]?.target || "Cible..."}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'suivi' && isEditing && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Indicateur suivi
                      </label>
                      <div className="p-3 bg-gray-50 border border-border rounded-lg text-sm text-gray-700">
                        {formData.indicator || formData.intervention_label}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Suivi S1
                      </label>
                      <input
                        type="text"
                        value={formData.s1_value}
                        onChange={e => setFormData({ ...formData, s1_value: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                        placeholder="Valeur atteinte en S1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Suivi S2
                      </label>
                      <input
                        type="text"
                        value={formData.s2_value}
                        onChange={e => setFormData({ ...formData, s2_value: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                        placeholder="Valeur atteinte en S2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Suivi S3
                      </label>
                      <input
                        type="text"
                        value={formData.s3_value}
                        onChange={e => setFormData({ ...formData, s3_value: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                        placeholder="Valeur atteinte en S3"
                      />
                    </div>
                  </>
                )}

                {(activeTab === 'planification' || !isEditing) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Sources de vérification
                      </label>
                      <textarea
                        rows={2}
                        value={formData.verification_source}
                        onChange={e => setFormData({ ...formData, verification_source: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                        placeholder={placeholders[currentLevel]?.source || "Sources..."}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Hypothèses
                      </label>
                      <textarea
                        rows={2}
                        value={formData.risks_assumptions}
                        onChange={e => setFormData({ ...formData, risks_assumptions: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-blue-500"
                        placeholder={placeholders[currentLevel]?.risks || "Hypothèses..."}
                      />
                    </div>
                  </>
                )}
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
