'use client'

import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { createEvmSnapshot } from '@/lib/actions/evm-snapshots.actions'
import { Save } from 'lucide-react'

export function EvmHistory({ projectId, snapshots, currentSummary }: { projectId: string, snapshots: any[], currentSummary: any }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateSnapshot = async () => {
    if (!currentSummary) return
    setLoading(true)
    setError(null)
    try {
      const data = {
        control_date: new Date().toISOString().split('T')[0],
        bac_total: currentSummary.bac_total,
        pv_total: currentSummary.pv_total,
        ev_total: currentSummary.ev_total,
        ac_total: currentSummary.ac_total,
        cpi_global: currentSummary.cpi_global,
        spi_global: currentSummary.spi_global,
        eac_global: currentSummary.eac_global,
      }
      const res = await createEvmSnapshot(projectId, data)
      if (res.error) {
        setError(res.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-text-primary">Historique des Arrêtés EVM</h3>
        <button
          onClick={handleCreateSnapshot}
          disabled={loading || !currentSummary}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Sauvegarde...' : 'Générer un Arrêté'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger/10 text-danger text-sm rounded-lg">
          {error}
        </div>
      )}

      {snapshots.length > 0 ? (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={snapshots} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="control_date" stroke="#64748b" fontSize={12} tickFormatter={(val) => new Date(val).toLocaleDateString('fr-FR')} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(val)} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                labelFormatter={(val) => new Date(val).toLocaleDateString('fr-FR')}
                formatter={(value: any) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(value)}
              />
              <Legend />
              <Line type="monotone" dataKey="pv_total" name="PV (Valeur Planifiée)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="ev_total" name="EV (Valeur Acquise)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="ac_total" name="AC (Coût Réel)" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-12 text-center text-text-secondary bg-surface-dim rounded-lg border border-dashed border-border">
          <p>Aucun historique disponible.</p>
          <p className="text-sm mt-1">Générez un premier arrêté pour commencer le suivi de la tendance.</p>
        </div>
      )}
    </div>
  )
}
