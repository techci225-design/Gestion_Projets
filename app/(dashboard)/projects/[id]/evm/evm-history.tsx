'use client'

import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Trash2, Save, Edit2, X } from 'lucide-react'
import { deleteEvmSnapshot, updateEvmSnapshotNotes } from '@/lib/actions/evm-snapshots.actions'
import { formatCurrency } from '@/lib/utils/format-currency'

function AlertBadge({ value }: { value: number }) {
  if (value >= 1) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20">
        {value.toFixed(2)}
      </span>
    )
  }
  if (value >= 0.9) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
        {value.toFixed(2)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20">
      {value.toFixed(2)}
    </span>
  )
}

function EditableNotes({ snapshotId, projectId, initialNotes }: { snapshotId: string, projectId: string, initialNotes: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [notes, setNotes] = useState(initialNotes || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await updateEvmSnapshotNotes(projectId, snapshotId, notes)
    setIsSaving(false)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input 
          type="text" 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex-1 text-sm bg-surface-bright border border-border rounded px-2 py-1 outline-none focus:border-primary"
          autoFocus
        />
        <button onClick={handleSave} disabled={isSaving} className="text-success hover:text-success-dark">
          <Save className="w-4 h-4" />
        </button>
        <button onClick={() => { setNotes(initialNotes || ''); setIsEditing(false) }} disabled={isSaving} className="text-text-secondary hover:text-danger">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between group">
      <span className="text-sm truncate max-w-[200px]" title={notes}>{notes || <span className="text-text-secondary italic">Aucune note</span>}</span>
      <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-primary transition-opacity">
        <Edit2 className="w-4 h-4" />
      </button>
    </div>
  )
}

export function EvmHistory({ projectId, snapshots, currentSummary }: { projectId: string, snapshots: any[], currentSummary: any }) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet arrêté ?')) return
    setIsDeleting(id)
    await deleteEvmSnapshot(projectId, id)
    setIsDeleting(null)
  }

  // Sort descending for the table
  const sortedSnapshots = [...snapshots].sort((a, b) => new Date(b.control_date).getTime() - new Date(a.control_date).getTime())

  // Sort ascending for the chart
  const chartSnapshots = [...snapshots].sort((a, b) => new Date(a.control_date).getTime() - new Date(b.control_date).getTime())

  return (
    <div className="space-y-6 mt-6">
      {/* Historique Table */}
      <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
        <h3 className="text-lg font-bold text-text-primary mb-4">Historique des Arrêtés EVM</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-dim border-b border-border">
                <th className="p-4 text-xs font-medium text-text-secondary w-32">Date d'arrêté</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-32 text-right">BAC (FCFA)</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-32 text-right">EAC (FCFA)</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-32 text-right">VAC (FCFA)</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-20 text-center">CPI</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-20 text-center">SPI</th>
                <th className="p-4 text-xs font-medium text-text-secondary">Notes</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-text-primary">
              {sortedSnapshots.map((item, index) => {
                const vac = Number(item.bac_total) - Number(item.eac_global)
                return (
                  <tr key={item.id} className={`border-b border-border hover:bg-surface-bright transition-colors h-12 ${index % 2 !== 0 ? 'bg-surface-dim/30' : ''}`}>
                    <td className="p-4 font-medium">{new Date(item.control_date).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4 text-right">{formatCurrency(item.bac_total)}</td>
                    <td className="p-4 text-right">{formatCurrency(item.eac_global)}</td>
                    <td className={`p-4 text-right font-semibold ${vac < 0 ? 'text-danger' : 'text-success'}`}>
                      {vac > 0 ? '+' : ''}{formatCurrency(vac)}
                    </td>
                    <td className="p-4 text-center">
                      <AlertBadge value={Number(item.cpi_global)} />
                    </td>
                    <td className="p-4 text-center">
                      <AlertBadge value={Number(item.spi_global)} />
                    </td>
                    <td className="p-4">
                      <EditableNotes snapshotId={item.id} projectId={projectId} initialNotes={item.notes} />
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleDelete(item.id)}
                        disabled={isDeleting === item.id}
                        className="text-text-secondary hover:text-danger disabled:opacity-50 transition-colors p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {sortedSnapshots.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-secondary">Aucun arrêté sauvegardé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tendance Chart */}
      <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
        <h3 className="text-lg font-bold text-text-primary mb-4">Évolution de la performance</h3>
        {chartSnapshots.length >= 2 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSnapshots} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="control_date" stroke="#64748b" fontSize={12} tickFormatter={(val) => new Date(val).toLocaleDateString('fr-FR')} />
                <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                  labelFormatter={(val) => new Date(val).toLocaleDateString('fr-FR')}
                  formatter={(value: any, name: any) => [Number(value).toFixed(2), String(name)]}
                />
                <Legend />
                <ReferenceLine y={1.0} stroke="#16A34A" strokeDasharray="3 3" label={{ position: 'right', value: '1.0 (Optimal)', fill: '#16A34A', fontSize: 12 }} />
                <ReferenceLine y={0.9} stroke="#DC2626" strokeDasharray="3 3" label={{ position: 'right', value: '0.9 (Alerte)', fill: '#DC2626', fontSize: 12 }} />
                
                <Line type="monotone" dataKey="cpi_global" name="CPI" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="spi_global" name="SPI" stroke="#16A34A" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center text-text-secondary bg-surface-dim rounded-lg border border-dashed border-border">
            <p>Sauvegardez au moins 2 arrêtés pour voir la tendance.</p>
          </div>
        )}
      </div>
    </div>
  )
}
