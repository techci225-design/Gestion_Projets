'use client'

import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format-currency'
import { Flame } from 'lucide-react'

interface BurnRateChartProps {
  operations: any[]
}

export function BurnRateChart({ operations }: BurnRateChartProps) {
  // Grouper les décaissements par mois (YYYY-MM)
  const groupedData = operations.reduce((acc: any, op) => {
    if (op.status === 'decaisse') {
      const date = new Date(op.created_at)
      // Format: "Jan 2026", "Fév 2026", etc.
      const month = date.toLocaleString('fr-FR', { month: 'short', year: 'numeric' })
      
      if (!acc[month]) {
        acc[month] = { month, decaissement: 0 }
      }
      acc[month].decaissement += Number(op.montant_decaisse)
    }
    return acc
  }, {})

  // Transformer l'objet en tableau, trié par mois (l'ordre d'insertion est souvent chronologique 
  // si les opérations sont déjà triées par created_at asc depuis la base)
  let data = Object.values(groupedData) as any[]

  // Calcul du cumul
  let cumul = 0
  data = data.map(d => {
    cumul += d.decaissement
    return { ...d, cumul }
  })

  if (data.length === 0) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border shadow-sm mb-6 flex flex-col items-center justify-center min-h-[300px]">
        <Flame className="w-8 h-8 text-text-secondary mb-2 opacity-50" />
        <p className="text-text-secondary text-sm">Pas encore de décaissements pour générer le rythme (Burn Rate).</p>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-xl p-6 border border-border shadow-sm mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Flame className="w-5 h-5 text-warning" />
            Rythme des décaissements (Burn Rate)
          </h3>
          <p className="text-sm text-text-secondary">Évolution chronologique de la consommation des fonds.</p>
        </div>
      </div>
      
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCumul" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
            <YAxis 
              tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} 
              tickLine={false} 
              axisLine={false}
              tick={{ fontSize: 12, fill: '#64748B' }}
            />
            <Tooltip 
              formatter={(value: any, name: any) => [formatCurrency(Number(value) || 0), name === 'cumul' ? 'Cumul Décaissements' : 'Décaissement du mois']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="top" height={36} />
            <Area 
              type="monotone" 
              dataKey="cumul" 
              name="Cumul Décaissements" 
              stroke="#2563EB" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorCumul)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
