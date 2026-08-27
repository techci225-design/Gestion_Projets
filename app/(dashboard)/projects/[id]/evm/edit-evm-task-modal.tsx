'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { updateEvmTask } from '@/lib/actions/evm.actions'
import { getDisplayCurrency } from '@/lib/utils/currency'

interface EditEvmTaskModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  task: any
  currency?: string
}

export function EditEvmTaskModal({ 
  isOpen, 
  onClose, 
  projectId,
  task,
  currency
}: EditEvmTaskModalProps) {
  const displayCurrency = getDisplayCurrency(currency)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [percent, setPercent] = useState(task.percent_complete || 0)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await updateEvmTask({
        id: task.id,
        project_id: projectId,
        code: formData.get('code') as string,
        description: formData.get('description') as string,
        responsible: formData.get('responsible') as string || undefined,
        date_start: formData.get('date_start') as string,
        date_end: formData.get('date_end') as string,
        budget_allocated: Number(formData.get('budget_allocated')),
        percent_complete: percent,
        actual_cost: Number(formData.get('actual_cost')) || 0
      })

      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm transition-all">
      <div className="w-full max-w-md h-full bg-surface shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-border bg-white">
          <h2 className="text-xl font-semibold text-primary">Modifier Tâche EVM</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-dim rounded-full transition-colors text-text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-error-container border border-error/20 text-on-error-container rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Code Tâche</label>
              <input
                name="code"
                type="text"
                required
                defaultValue={task.code}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
              <input
                name="description"
                type="text"
                required
                defaultValue={task.description}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Responsable</label>
              <input
                name="responsible"
                type="text"
                defaultValue={task.responsible || ''}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Date début</label>
                <input
                  name="date_start"
                  type="date"
                  required
                  defaultValue={task.date_start}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Date fin</label>
                <input
                  name="date_end"
                  type="date"
                  required
                  defaultValue={task.date_end}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Budget Alloué ({displayCurrency})</label>
              <input
                name="budget_allocated"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={task.budget_allocated}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-text-primary">Avancement</label>
                <span className="text-sm font-semibold text-primary">{percent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Coût Réel ({displayCurrency})</label>
              <input
                name="actual_cost"
                type="number"
                min="0"
                step="0.01"
                defaultValue={task.actual_cost || 0}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border mt-auto flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-dim rounded-md transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
