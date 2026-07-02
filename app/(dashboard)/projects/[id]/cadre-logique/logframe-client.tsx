'use client'

import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Plus } from 'lucide-react'

export interface LogframeItem {
  id: string
  project_id: string
  parent_id: string | null
  level: 'objectif_global' | 'objectif_specifique' | 'resultat' | 'activite'
  intervention_label: string
  indicator: string | null
  baseline: string | null
  target: string | null
  verification_source: string | null
  risks_assumptions: string | null
}

type LogframeNode = LogframeItem & { children: LogframeNode[] }

function buildTree(items: LogframeItem[]): LogframeNode[] {
  const nodeMap = new Map<string, LogframeNode>()
  const roots: LogframeNode[] = []

  items.forEach(item => {
    nodeMap.set(item.id, { ...item, children: [] })
  })

  items.forEach(item => {
    const node = nodeMap.get(item.id)!
    if (item.parent_id && nodeMap.has(item.parent_id)) {
      nodeMap.get(item.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

const levelConfig = {
  objectif_global: {
    bg: 'bg-[#f0f7ff]',
    labelBg: 'bg-primary text-white',
    border: 'border-l-primary',
    marginLeft: 'ml-0',
    title: 'Objectif Global (Impact)'
  },
  objectif_specifique: {
    bg: 'bg-[#e0f2fe]',
    labelBg: 'bg-blue-200 text-blue-900',
    border: 'border-l-blue-500',
    marginLeft: 'ml-4',
    title: 'Objectif Spécifique (Effet)'
  },
  resultat: {
    bg: 'bg-[#f8fafc]',
    labelBg: 'bg-slate-200 text-slate-900',
    border: 'border-l-slate-400',
    marginLeft: 'ml-8',
    title: 'Résultat (Extrant)'
  },
  activite: {
    bg: 'bg-white',
    labelBg: 'border border-slate-300 text-slate-600',
    border: 'border-l-slate-200',
    marginLeft: 'ml-12',
    title: 'Activité'
  }
}

function LogframeNodeRenderer({ node }: { node: LogframeNode }) {
  const [expanded, setExpanded] = useState(true)
  const config = levelConfig[node.level]

  return (
    <div className={`hierarchy-item border-l-4 ${config.border} ${config.marginLeft} transition-all duration-300`}>
      <div 
        className={`flex flex-col lg:grid lg:grid-cols-12 gap-4 px-4 py-3 border-b border-border items-start cursor-pointer hover:brightness-95 transition-all ${config.bg}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="col-span-3 flex items-start gap-2 w-full">
          {node.children.length > 0 ? (
            expanded ? <ChevronDown className="w-5 h-5 text-primary mt-1 shrink-0" /> : <ChevronRight className="w-5 h-5 text-primary mt-1 shrink-0" />
          ) : (
            <div className="w-5 h-5 shrink-0" />
          )}
          <div>
            <span className={`inline-block font-medium text-[10px] px-2 py-0.5 rounded-full mb-1 ${config.labelBg}`}>
              {config.title}
            </span>
            <p className="font-semibold text-text-primary text-sm leading-snug">{node.intervention_label}</p>
          </div>
        </div>

        <div className="col-span-2 flex flex-col w-full text-sm">
          <span className="lg:hidden text-xs text-text-secondary font-medium mb-1">Indicateur:</span>
          <span className="text-text-primary">{node.indicator || '—'}</span>
        </div>
        <div className="col-span-1 flex flex-col w-full text-sm">
          <span className="lg:hidden text-xs text-text-secondary font-medium mb-1">Base:</span>
          <span className="text-text-primary">{node.baseline || '—'}</span>
        </div>
        <div className="col-span-2 flex flex-col w-full text-sm">
          <span className="lg:hidden text-xs text-text-secondary font-medium mb-1">Cible:</span>
          <span className="text-text-primary">{node.target || '—'}</span>
        </div>
        <div className="col-span-2 flex flex-col w-full text-sm">
          <span className="lg:hidden text-xs text-text-secondary font-medium mb-1">Source:</span>
          <span className="text-text-primary">{node.verification_source || '—'}</span>
        </div>
        <div className="col-span-2 flex flex-col w-full text-sm">
          <span className="lg:hidden text-xs text-text-secondary font-medium mb-1">Hypothèses:</span>
          <span className="text-text-primary">{node.risks_assumptions || '—'}</span>
        </div>
      </div>

      {expanded && node.children.length > 0 && (
        <div className="accordion-content">
          {node.children.map(child => (
            <LogframeNodeRenderer key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  )
}

import { AddLogframeModal } from './add-logframe-modal'

export function LogframeClient({ items, projectId }: { items: LogframeItem[], projectId: string }) {
  const roots = buildTree(items)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalParentId, setModalParentId] = useState<string | undefined>(undefined)
  const [modalLevel, setModalLevel] = useState<LogframeItem['level']>('objectif_global')

  const openAddModal = (parentId?: string, level?: LogframeItem['level']) => {
    setModalParentId(parentId)
    setModalLevel(level || 'objectif_global')
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={() => openAddModal()}
          className="bg-primary text-white font-medium text-sm rounded-lg py-2 px-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-1 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter un élément
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 bg-surface-dim border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider sticky top-0 z-10">
          <div className="col-span-3">Niveau / Description</div>
          <div className="col-span-2">Indicateur (IOV)</div>
          <div className="col-span-1">Ligne de base</div>
          <div className="col-span-2">Cible visée</div>
          <div className="col-span-2">Source de vérification</div>
          <div className="col-span-2">Hypothèses &amp; Risques</div>
        </div>

        <div className="flex flex-col">
          {roots.length > 0 ? (
            roots.map(root => <LogframeNodeRenderer key={root.id} node={root} />)
          ) : (
            <div className="p-8 text-center text-text-secondary">
              Aucun élément dans le cadre logique.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <AddLogframeModal 
          projectId={projectId}
          parentId={modalParentId}
          defaultLevel={modalLevel}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
