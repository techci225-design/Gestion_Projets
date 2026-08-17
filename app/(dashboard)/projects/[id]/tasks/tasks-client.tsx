'use client'

import React, { useState, useTransition } from 'react'
import { Plus, Folder, CheckSquare, Flag, Edit, Trash2, ChevronRight, ChevronDown, MoveUp, MoveDown, Indent, Outdent, MoreVertical } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { getDisplayCurrency } from '@/lib/utils/currency'
import { hasProjectPermission, ProjectRole } from '@/lib/permissions/project-permissions'
import { deleteWbsTask, moveWbsTask } from '@/lib/actions/wbs.actions'
import { AddTaskModal } from './add-task-modal'
import { EditTaskModal } from './edit-task-modal'

interface TasksClientProps {
  projectId: string
  project: any
  initialTasks: any[]
  teamMembers: any[]
  userRole: string
}

export function TasksClient({ projectId, project, initialTasks, teamMembers, userRole }: TasksClientProps) {
  const tasks = initialTasks
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(initialTasks.map(t => t.id)))
  const [isPending, startTransition] = useTransition()
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [parentForNewTask, setParentForNewTask] = useState<string | null>(null)

  const canEdit = hasProjectPermission(userRole as ProjectRole, 'edit_tasks') || hasProjectPermission(userRole as ProjectRole, 'create_tasks')

  const displayCurrency = getDisplayCurrency(project?.currency)

  const toggleExpand = (id: string) => {
    const next = new Set(expandedNodes)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedNodes(next)
  }

  const handleDelete = async (task: any) => {
    const hasChildren = tasks.some(t => t.parent_id === task.id)
    if (hasChildren) {
      alert("Cette activité contient des sous-activités. Déplacez ou supprimez-les avant de supprimer cette activité.")
      return
    }
    if (!confirm(`Supprimer la tâche "${task.name}" ?`)) return

    startTransition(async () => {
      const res = await deleteWbsTask(task.id, projectId)
      if (res.error) {
        alert(res.error)
      } else {
        // Optimistic UI update could be done here, but server action revalidates
      }
    })
  }

  const handleMove = async (task: any, direction: 'up' | 'down') => {
    // Find siblings
    const siblings = tasks.filter(t => t.parent_id === task.parent_id).sort((a, b) => a.sort_order - b.sort_order)
    const currentIndex = siblings.findIndex(t => t.id === task.id)
    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === siblings.length - 1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const targetSibling = siblings[targetIndex]
    
    // We swap sort_orders
    startTransition(async () => {
      // Actually we just need to pass new sort order. The server shifts others.
      // Easiest is to set our sort order to targetSibling.sort_order
      // If moving up, targetSibling is the one above us. 
      const res = await moveWbsTask(task.id, projectId, task.parent_id, targetSibling.sort_order)
      if (res.error) alert(res.error)
    })
  }

  const handleIndent = async (task: any) => {
    // Make it a child of the previous sibling
    const siblings = tasks.filter(t => t.parent_id === task.parent_id).sort((a, b) => a.sort_order - b.sort_order)
    const currentIndex = siblings.findIndex(t => t.id === task.id)
    if (currentIndex === 0) return // Cannot indent first child

    const prevSibling = siblings[currentIndex - 1]
    if (prevSibling.task_type === 'MILESTONE') {
      alert("Un jalon ne peut pas avoir d'enfants.")
      return
    }

    // Get count of children in prevSibling to know the new sort_order
    const targetSiblingsCount = tasks.filter(t => t.parent_id === prevSibling.id).length

    startTransition(async () => {
      const res = await moveWbsTask(task.id, projectId, prevSibling.id, targetSiblingsCount)
      if (res.error) alert(res.error)
    })
  }

  const handleOutdent = async (task: any) => {
    if (!task.parent_id) return // Already at root

    const parent = tasks.find(t => t.id === task.parent_id)
    if (!parent) return

    // Move to after parent
    startTransition(async () => {
      const res = await moveWbsTask(task.id, projectId, parent.parent_id, parent.sort_order + 1)
      if (res.error) alert(res.error)
    })
  }

  const getIcon = (type: string) => {
    if (type === 'SUMMARY') return <Folder className="w-4 h-4 text-primary shrink-0" />
    if (type === 'MILESTONE') return <Flag className="w-4 h-4 text-warning shrink-0" />
    return <CheckSquare className="w-4 h-4 text-success shrink-0" />
  }

  // Determine visibility recursively based on expanded parents
  const isVisible = (task: any) => {
    let current = task.parent_id
    while (current) {
      if (!expandedNodes.has(current)) return false
      const parent = tasks.find((t) => t.id === current)
      current = parent?.parent_id
    }
    return true
  }

  const sortedTasks = [...initialTasks].sort((a, b) => {
    // Need a hierarchical sort. We can sort by code since it's "1.2.1"
    const aParts = a.code.split('.').map(Number)
    const bParts = b.code.split('.').map(Number)
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      if (aParts[i] === undefined) return -1
      if (bParts[i] === undefined) return 1
      if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i]
    }
    return 0
  })

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-1">Structure WBS / Tâches</h2>
          <p className="text-base text-text-secondary">Structurez, planifiez et suivez les activités de votre projet.</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setParentForNewTask(null); setIsAddModalOpen(true); }}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              disabled={isPending}
            >
              <Plus className="w-4 h-4" /> Nouvelle activité
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-dim border-b border-border text-text-secondary">
              <tr>
                <th className="p-4 font-medium w-24">WBS</th>
                <th className="p-4 font-medium min-w-[300px]">Activité</th>
                <th className="p-4 font-medium">Statut</th>
                <th className="p-4 font-medium">Progression</th>
                <th className="p-4 font-medium">Responsable</th>
                <th className="p-4 font-medium">Budget ({displayCurrency})</th>
                {canEdit && <th className="p-4 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedTasks.map((task) => {
                if (!isVisible(task)) return null

                const depth = task.code.split('.').length - 1
                const hasChildren = sortedTasks.some(t => t.parent_id === task.id)
                const isExpanded = expandedNodes.has(task.id)

                return (
                  <tr key={task.id} className="hover:bg-slate-50 group">
                    <td className="p-4 font-mono text-xs text-text-secondary">{task.code}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1.5}rem` }}>
                        <button 
                          onClick={() => hasChildren && toggleExpand(task.id)}
                          className={`w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 ${hasChildren ? 'cursor-pointer text-text-secondary' : 'opacity-0'}`}
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        {getIcon(task.task_type)}
                        <span className={`font-medium ${task.task_type === 'SUMMARY' ? 'text-primary' : 'text-text-primary'}`}>
                          {task.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${task.status === 'COMPLETED' ? 'bg-success/10 text-success-dark' : ''}
                        ${task.status === 'IN_PROGRESS' ? 'bg-primary/10 text-primary' : ''}
                        ${task.status === 'PLANNED' ? 'bg-slate-100 text-slate-700' : ''}
                        ${task.status === 'BLOCKED' ? 'bg-danger/10 text-danger' : ''}
                        ${task.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500 line-through' : ''}
                      `}>
                        {task.status === 'COMPLETED' ? 'Terminé' :
                         task.status === 'IN_PROGRESS' ? 'En cours' :
                         task.status === 'PLANNED' ? 'Planifié' :
                         task.status === 'BLOCKED' ? 'Bloqué' : 'Annulé'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-200 rounded-full h-1.5 max-w-[100px]">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${task.percent_complete}%` }}></div>
                        </div>
                        <span className="text-xs text-text-secondary">{task.percent_complete}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-text-secondary">
                      {task.responsible?.profiles?.full_name || task.responsible_user_id || 'Non assigné'}
                    </td>
                    <td className="p-4 font-mono text-right">
                      {formatCurrency(Number(task.budget_allocated), displayCurrency, true)}
                    </td>
                    
                    {canEdit && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          
                          {task.task_type !== 'MILESTONE' && (
                            <button 
                              onClick={() => { setParentForNewTask(task.id); setIsAddModalOpen(true); }}
                              className="p-1.5 text-slate-400 hover:text-primary rounded hover:bg-primary/10"
                              title="Ajouter une sous-activité"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleIndent(task)}
                            className="p-1.5 text-slate-400 hover:text-primary rounded hover:bg-primary/10"
                            title="Indenter"
                          >
                            <Indent className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleOutdent(task)}
                            className="p-1.5 text-slate-400 hover:text-primary rounded hover:bg-primary/10"
                            title="Désindenter"
                          >
                            <Outdent className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleMove(task, 'up')}
                            className="p-1.5 text-slate-400 hover:text-primary rounded hover:bg-primary/10"
                            title="Monter"
                          >
                            <MoveUp className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleMove(task, 'down')}
                            className="p-1.5 text-slate-400 hover:text-primary rounded hover:bg-primary/10"
                            title="Descendre"
                          >
                            <MoveDown className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => { setSelectedTask(task); setIsEditModalOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-warning rounded hover:bg-warning/10 ml-2"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => handleDelete(task)}
                            className="p-1.5 text-slate-400 hover:text-danger rounded hover:bg-danger/10"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              
              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="p-8 text-center">
                    <div className="flex flex-col items-center justify-center text-text-secondary">
                      <Folder className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-lg font-medium text-slate-500">Votre structure WBS est encore vide.</p>
                      <p className="text-sm mb-4">Commencez par créer votre première activité.</p>
                      {canEdit && (
                        <button
                          onClick={() => { setParentForNewTask(null); setIsAddModalOpen(true); }}
                          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                          <Plus className="w-4 h-4" /> Créer une activité
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <AddTaskModal
          projectId={projectId}
          parentId={parentForNewTask}
          tasks={tasks}
          teamMembers={teamMembers}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {isEditModalOpen && selectedTask && (
        <EditTaskModal
          projectId={projectId}
          task={selectedTask}
          tasks={tasks}
          teamMembers={teamMembers}
          onClose={() => { setIsEditModalOpen(false); setSelectedTask(null); }}
        />
      )}
    </div>
  )
}
