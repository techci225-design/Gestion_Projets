'use client'

import React, { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { updateWbsTask } from '@/lib/actions/wbs.actions'
import { getTeamMemberDisplayName } from '@/lib/utils/user'

export function EditTaskModal({ projectId, task, tasks, teamMembers, onClose }: { projectId: string, task: any, tasks: any[], teamMembers: any[], onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    
    const formData = new FormData(e.currentTarget)
    const data = {
      project_id: projectId,
      parent_id: formData.get('parent_id') as string || null,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      task_type: formData.get('task_type') as string,
      status: formData.get('status') as string,
      priority: formData.get('priority') as string,
      responsible_user_id: formData.get('responsible_user_id') as string || null,
      date_start: formData.get('date_start') as string,
      date_end: formData.get('date_end') as string,
      budget_allocated: Number(formData.get('budget_allocated')) || 0,
      percent_complete: Number(formData.get('percent_complete')) || 0,
    }

    startTransition(async () => {
      const res = await updateWbsTask(task.id, projectId, data)
      if (res.error) {
        setError(res.error)
      } else {
        onClose()
      }
    })
  }

  // Prevent selecting self or descendants as parent
  const isDescendant = (potentialParentId: string, currentTaskId: string) => {
    let current = potentialParentId
    while (current) {
      if (current === currentTaskId) return true
      const p = tasks.find(t => t.id === current)
      current = p?.parent_id
    }
    return false
  }

  const validParents = tasks.filter(t => t.task_type !== 'MILESTONE' && !isDescendant(t.id, task.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-dim">
          <h3 className="text-xl font-bold text-text-primary">Modifier l'Activité : {task.code}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-text-primary">Nom de l'activité <span className="text-danger">*</span></label>
                <input type="text" name="name" defaultValue={task.name} required className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
              </div>
              
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-text-primary">Description</label>
                <textarea name="description" rows={3} defaultValue={task.description} className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"></textarea>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Type <span className="text-danger">*</span></label>
                <select name="task_type" required defaultValue={task.task_type} className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm">
                  <option value="SUMMARY">Groupe (Summary)</option>
                  <option value="TASK">Tâche</option>
                  <option value="MILESTONE">Jalon (Milestone)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Activité Parente</label>
                <select name="parent_id" defaultValue={task.parent_id || ''} className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm">
                  <option value="">-- Racine du projet --</option>
                  {validParents.map(t => (
                    <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Date de début <span className="text-danger">*</span></label>
                <input type="date" name="date_start" defaultValue={task.date_start} required className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Date de fin <span className="text-danger">*</span></label>
                <input type="date" name="date_end" defaultValue={task.date_end} required className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Statut <span className="text-danger">*</span></label>
                <select name="status" required defaultValue={task.status} className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm">
                  <option value="PLANNED">Planifié</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="COMPLETED">Terminé</option>
                  <option value="BLOCKED">Bloqué</option>
                  <option value="CANCELLED">Annulé</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Priorité <span className="text-danger">*</span></label>
                <select name="priority" required defaultValue={task.priority} className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm">
                  <option value="LOW">Basse</option>
                  <option value="MEDIUM">Moyenne</option>
                  <option value="HIGH">Haute</option>
                  <option value="CRITICAL">Critique</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Responsable</label>
                <select name="responsible_user_id" defaultValue={task.responsible_user_id || ''} className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm">
                  <option value="">-- Sélectionner un responsable --</option>
                  {teamMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>{getTeamMemberDisplayName(m, teamMembers)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Avancement (%)</label>
                <input type="number" name="percent_complete" min="0" max="100" defaultValue={task.percent_complete} className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-text-primary">Budget alloué</label>
                <input type="number" name="budget_allocated" min="0" step="0.01" defaultValue={task.budget_allocated} className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
              </div>
            </div>

          </div>
          
          <div className="p-4 border-t border-border flex justify-end gap-3 bg-surface-dim">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
