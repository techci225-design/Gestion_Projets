'use client'

import React, { useState } from 'react'
import { LogframeItem, LogframeLevel, addLogframeItem, updateLogframeItem, deleteLogframeItem } from '@/lib/actions/logframe.actions'
import { LogframeIndicator, LogframeIndicatorTracking, addLogframeIndicator, addLogframeIndicatorTracking, deleteLogframeIndicator, deleteLogframeIndicatorTracking, updateLogframeIndicator } from '@/lib/actions/logframe-indicators.actions'
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

interface LogframeClientProps {
  projectId: string
  initialData: LogframeItem[]
  initialIndicators: LogframeIndicator[]
  initialTracking: LogframeIndicatorTracking[]
  canManage: boolean
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

const createDefaultTrackingForm = () => ({
  measured_at: new Date().toISOString().slice(0, 10),
  period_number: '1',
  period_year: new Date().getFullYear().toString(),
  value: '',
  comment: '',
  source_url: '',
})

export function LogframeClient({ projectId, initialData, initialIndicators, initialTracking, canManage }: LogframeClientProps) {
  const [activeTab, setActiveTab] = useState<'planification' | 'suivi'>('planification')
  const [data, setData] = useState<LogframeItem[]>(initialData)
  const [indicators, setIndicators] = useState<LogframeIndicator[]>(initialIndicators)
  const [tracking, setTracking] = useState<LogframeIndicatorTracking[]>(initialTracking)
  const [trackingIndicator, setTrackingIndicator] = useState<LogframeIndicator | null>(null)
  const [trackingForm, setTrackingForm] = useState(createDefaultTrackingForm)
  const [indicatorItem, setIndicatorItem] = useState<LogframeItem | null>(null)
  const [editingIndicator, setEditingIndicator] = useState<LogframeIndicator | null>(null)
  const [indicatorForm, setIndicatorForm] = useState({ name: '', type: 'qualitative' as 'quantitative' | 'qualitative', baseline_text: '', target_text: '', verification_source: '' })
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

  const indicatorsFor = (logframeItemId: string) =>
    indicators.filter(indicator => indicator.logframe_item_id === logframeItemId)

  const openIndicatorEditor = (item: LogframeItem, indicator?: LogframeIndicator) => {
    setIndicatorItem(item)
    setEditingIndicator(indicator ?? null)
    setIndicatorForm({
      name: indicator?.name ?? '',
      type: indicator?.type ?? 'qualitative',
      baseline_text: indicator?.baseline_text ?? (indicator?.baseline_numeric?.toString() ?? ''),
      target_text: indicator?.target_text ?? (indicator?.target_numeric?.toString() ?? ''),
      verification_source: indicator?.verification_source ?? '',
    })
  }

  const saveTracking = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!trackingIndicator) return
    try {
      const isQuantitative = trackingIndicator.type === 'quantitative'
      const created = await addLogframeIndicatorTracking(projectId, {
        indicator_id: trackingIndicator.id,
        measured_at: trackingForm.measured_at,
        period_type: 'semester',
        period_number: Number(trackingForm.period_number),
        period_year: Number(trackingForm.period_year),
        value_numeric: isQuantitative ? Number(trackingForm.value) : null,
        value_text: isQuantitative ? null : trackingForm.value,
        comment: trackingForm.comment || null,
        source_url: trackingForm.source_url || null,
      })
      setTracking(current => [created, ...current])
      setTrackingIndicator(null)
      setTrackingForm(createDefaultTrackingForm())
    } catch {
      alert('Impossible d’enregistrer le relevé')
    }
  }

  const saveIndicator = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!indicatorItem) return
    const isQuantitative = indicatorForm.type === 'quantitative'
    const payload = {
      name: indicatorForm.name,
      type: indicatorForm.type,
      baseline_numeric: isQuantitative ? Number(indicatorForm.baseline_text) : null,
      baseline_text: isQuantitative ? null : indicatorForm.baseline_text || null,
      target_numeric: isQuantitative ? Number(indicatorForm.target_text) : null,
      target_text: isQuantitative ? null : indicatorForm.target_text || null,
      verification_source: indicatorForm.verification_source || null,
    }
    try {
      if (editingIndicator) {
        const updated = await updateLogframeIndicator(projectId, editingIndicator.id, payload)
        setIndicators(current => current.map(indicator => indicator.id === updated.id ? updated : indicator))
      } else {
        const created = await addLogframeIndicator(projectId, { ...payload, logframe_item_id: indicatorItem.id })
        setIndicators(current => [...current, created])
      }
      setEditingIndicator(null)
      setIndicatorForm({ name: '', type: 'qualitative', baseline_text: '', target_text: '', verification_source: '' })
    } catch {
      alert("Impossible d’enregistrer l’indicateur")
    }
  }

  const displayIndicatorValues = (
    logframeItemId: string,
    field: 'name' | 'baseline' | 'target' | 'verification_source',
  ) => {
    const values = indicatorsFor(logframeItemId).map(indicator => {
      if (field === 'name') return indicator.name
      if (field === 'baseline') return indicator.baseline_numeric ?? indicator.baseline_text
      if (field === 'target') return indicator.target_numeric ?? indicator.target_text
      return indicator.verification_source
    }).filter((value): value is string | number => value !== null && value !== undefined && value !== '')

    return values.length > 0 ? values.join(' · ') : '—'
  }

  const matrixValue = (indicatorId: string, semester: number) => {
    const value = tracking.find(entry =>
      entry.indicator_id === indicatorId
      && entry.period_type === 'semester'
      && entry.period_number === semester,
    )

    return value?.value_numeric ?? value?.value_text ?? '—'
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
            <td className="p-4 align-top text-sm text-text-secondary">{displayIndicatorValues(item.id, 'name')}</td>
            <td className="p-4 align-top text-sm text-text-secondary">{displayIndicatorValues(item.id, 'baseline')}</td>
            <td className="p-4 align-top text-sm text-text-secondary">{displayIndicatorValues(item.id, 'target')}</td>
            <td className="p-4 align-top text-sm text-text-secondary">{displayIndicatorValues(item.id, 'verification_source')}</td>
            <td className="p-4 align-top text-sm text-text-secondary">{item.risks_assumptions || '—'}</td>
            <td className="p-4 align-top text-right">
              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Reveal actions on hover, actually let's just show them always for mobile friendliness or use a dropdown */}
              </div>
              <div className="flex flex-col items-end gap-2">
                {canManage && (
                  <>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openIndicatorEditor(item)} className="p-1.5 text-text-secondary hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Gérer les indicateurs">
                        <Plus className="w-4 h-4" />
                      </button>
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
                  </>
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
  const isEditing = !!editingItem

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
        {activeTab === 'planification' && canManage && (
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
        <div className="border border-[#1e3a6a] rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="bg-[#1e3a6a] text-white text-center font-bold py-2.5 text-sm uppercase tracking-wide">
            Matrice des résultats (Suivi semestriel)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm border-collapse">
              <thead className="bg-[#3b82f6] text-white">
                <tr>
                  <th className="p-3 font-semibold border-r border-blue-400 w-[40%]">Composante / Résultat</th>
                  <th className="p-3 font-semibold text-center border-r border-blue-400">Base (départ)</th>
                  <th className="p-3 font-semibold text-center border-r border-blue-400">S1</th>
                  <th className="p-3 font-semibold text-center border-r border-blue-400">S2</th>
                  <th className="p-3 font-semibold text-center border-r border-blue-400">S3</th>
                  <th className="p-3 font-semibold text-center">S4 (But final)</th>
                </tr>
              </thead>
              <tbody>
                {indicators.length > 0 ? indicators.map(indicator => {
                  const item = data.find(logframeItem => logframeItem.id === indicator.logframe_item_id)
                  const baseline = indicator.baseline_numeric ?? indicator.baseline_text ?? '—'
                  const target = indicator.target_numeric ?? indicator.target_text ?? '—'

                  return (
                    <tr key={indicator.id} className="border-b border-blue-100 bg-white hover:bg-slate-50 transition-colors">
                      <td className="p-3 border-r border-blue-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                          {item ? levelLabels[item.level] : 'Résultat'}
                        </p>
                        <p className="mt-1 font-medium text-text-primary">{item?.intervention_label ?? 'Élément du cadre logique'}</p>
                        <p className="mt-1 text-xs text-text-secondary">{indicator.name}</p>
                      </td>
                      <td className="p-3 text-center border-r border-blue-100 text-text-secondary">{baseline}</td>
                      <td className="p-3 text-center border-r border-blue-100 font-medium text-text-primary">{matrixValue(indicator.id, 1)}</td>
                      <td className="p-3 text-center border-r border-blue-100 font-medium text-text-primary">{matrixValue(indicator.id, 2)}</td>
                      <td className="p-3 text-center border-r border-blue-100 font-medium text-text-primary">{matrixValue(indicator.id, 3)}</td>
                      <td className="p-3 text-center font-bold text-text-secondary">{target}</td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-secondary">
                      Aucun indicateur à afficher. Ajoutez un indicateur depuis l’onglet Cadre Logique.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {indicatorItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-xl rounded-xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div><h3 className="text-lg font-semibold text-text-primary">Indicateurs</h3><p className="text-sm text-text-secondary mt-1">{indicatorItem.intervention_label}</p></div>
              <button onClick={() => setIndicatorItem(null)} className="text-text-secondary hover:text-text-primary p-2">&times;</button>
            </div>
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {indicatorsFor(indicatorItem.id).map(indicator => (
                <div key={indicator.id} className="border border-border rounded-lg p-3 flex items-start justify-between gap-3">
                  <div><p className="font-medium text-text-primary">{indicator.name}</p><p className="text-xs text-text-secondary mt-1">Base : {indicator.baseline_numeric ?? indicator.baseline_text ?? '—'} · Cible : {indicator.target_numeric ?? indicator.target_text ?? '—'}</p></div>
                  {canManage && <div className="flex gap-1"><button onClick={() => { setTrackingIndicator(indicator); setTrackingForm(createDefaultTrackingForm()) }} className="px-2 text-xs text-blue-600 hover:bg-blue-50 rounded">Relevé</button><button onClick={() => openIndicatorEditor(indicatorItem, indicator)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Modifier"><Edit2 className="w-4 h-4" /></button><button onClick={async () => { if (!confirm('Supprimer cet indicateur ?')) return; await deleteLogframeIndicator(projectId, indicator.id); setIndicators(current => current.filter(value => value.id !== indicator.id)); setEditingIndicator(null) }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Supprimer"><Trash2 className="w-4 h-4" /></button></div>}
                </div>
              ))}
              {trackingIndicator && (
                <form onSubmit={saveTracking} className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between gap-3"><h4 className="font-medium text-blue-900">Nouveau relevé : {trackingIndicator.name}</h4><button type="button" onClick={() => setTrackingIndicator(null)}>&times;</button></div>
                  <div className="grid grid-cols-2 gap-3">
                    <input required type="date" value={trackingForm.measured_at} onChange={event => setTrackingForm({ ...trackingForm, measured_at: event.target.value })} className="bg-white border border-border rounded-lg px-3 py-2" />
                    <input required type={trackingIndicator.type === 'quantitative' ? 'number' : 'text'} step="any" value={trackingForm.value} onChange={event => setTrackingForm({ ...trackingForm, value: event.target.value })} placeholder="Valeur mesurée" className="bg-white border border-border rounded-lg px-3 py-2" />
                    <select value={trackingForm.period_number} onChange={event => setTrackingForm({ ...trackingForm, period_number: event.target.value })} className="bg-white border border-border rounded-lg px-3 py-2">
                      <option value="1">Semestre 1</option><option value="2">Semestre 2</option><option value="3">Semestre 3</option><option value="4">Semestre 4</option>
                    </select>
                    <input required type="number" min="2000" max="2100" value={trackingForm.period_year} onChange={event => setTrackingForm({ ...trackingForm, period_year: event.target.value })} placeholder="Année" className="bg-white border border-border rounded-lg px-3 py-2" />
                  </div>
                  <input value={trackingForm.source_url} onChange={event => setTrackingForm({ ...trackingForm, source_url: event.target.value })} placeholder="Lien source (optionnel)" className="w-full bg-white border border-border rounded-lg px-3 py-2" />
                  <textarea value={trackingForm.comment} onChange={event => setTrackingForm({ ...trackingForm, comment: event.target.value })} placeholder="Commentaire (optionnel)" className="w-full bg-white border border-border rounded-lg px-3 py-2" />
                  <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg">Enregistrer le relevé</button>
                </form>
              )}
              {indicatorsFor(indicatorItem.id).flatMap(indicator => tracking.filter(value => value.indicator_id === indicator.id).map(value => <div key={value.id} className="text-xs text-text-secondary flex justify-between border-t border-border pt-2"><span>{indicator.name} — {value.measured_at} : {value.value_numeric ?? value.value_text}</span>{canManage && <button onClick={async () => { await deleteLogframeIndicatorTracking(projectId, value.id); setTracking(current => current.filter(item => item.id !== value.id)) }} className="text-red-600">Supprimer</button>}</div>))}
              {canManage && <form onSubmit={saveIndicator} className="border-t border-border pt-5 space-y-3">
                <h4 className="font-medium text-text-primary">{editingIndicator ? 'Modifier l’indicateur' : 'Nouvel indicateur'}</h4>
                <input required value={indicatorForm.name} onChange={event => setIndicatorForm({ ...indicatorForm, name: event.target.value })} placeholder="Indicateur (IOV)" className="w-full bg-background border border-border rounded-lg px-3 py-2" />
                <select value={indicatorForm.type} onChange={event => setIndicatorForm({ ...indicatorForm, type: event.target.value as 'quantitative' | 'qualitative' })} className="w-full bg-background border border-border rounded-lg px-3 py-2"><option value="qualitative">Qualitatif</option><option value="quantitative">Quantitatif</option></select>
                <input required value={indicatorForm.baseline_text} onChange={event => setIndicatorForm({ ...indicatorForm, baseline_text: event.target.value })} placeholder="Ligne de base" className="w-full bg-background border border-border rounded-lg px-3 py-2" />
                <input required value={indicatorForm.target_text} onChange={event => setIndicatorForm({ ...indicatorForm, target_text: event.target.value })} placeholder="Cible" className="w-full bg-background border border-border rounded-lg px-3 py-2" />
                <input value={indicatorForm.verification_source} onChange={event => setIndicatorForm({ ...indicatorForm, verification_source: event.target.value })} placeholder="Source de vérification" className="w-full bg-background border border-border rounded-lg px-3 py-2" />
                <div className="flex justify-end gap-2"><button type="button" onClick={() => { setEditingIndicator(null); setIndicatorForm({ name: '', type: 'qualitative', baseline_text: '', target_text: '', verification_source: '' }) }} className="px-3 py-2 text-sm text-text-secondary">Annuler</button><button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg">Enregistrer</button></div>
              </form>}
            </div>
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
