'use client'

import React from 'react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AlertTriangle } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface TopVariance {
  id: string
  code: string
  description: string
  cv: number
  cpi: number
}

export function TopVariancesChart({ data }: { data: TopVariance[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-danger" />
          <h3 className="font-semibold text-text-primary">Top Foyers de Surconsommation (Top 5)</h3>
        </div>
        <div className="px-6 py-8 text-center text-text-secondary">
          Aucun écart négatif constaté pour la date sélectionnée.
        </div>
      </div>
    )
  }

  // Format data for Recharts
  const chartData = data.map(v => ({
    name: v.code,
    description: v.description,
    absCV: Math.abs(v.cv),
    originalCV: v.cv,
    cpi: Number(v.cpi)
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-surface border border-border p-3 shadow-lg rounded-lg text-sm">
          <p className="font-bold text-text-primary">{data.name}</p>
          <p className="text-text-secondary mb-2 max-w-[250px] truncate">{data.description}</p>
          <p className="font-semibold text-danger">CV: {formatCurrency(data.originalCV)}</p>
          <p className="text-text-secondary">CPI: {data.cpi.toFixed(2)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-danger" />
        <h3 className="font-semibold text-text-primary">Top Foyers de Surconsommation (Top 5)</h3>
      </div>
      
      {/* Chart Section */}
      <div className="p-6 h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
            <XAxis 
              type="number" 
              tickFormatter={(value) => {
                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
                if (value >= 1000) return (value / 1000).toFixed(1) + 'k'
                return value.toString()
              }}
              stroke="#94A3B8"
              fontSize={12}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false}
              tickLine={false}
              stroke="#64748B"
              fontSize={12}
              fontWeight={500}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar 
              dataKey="absCV" 
              fill="#DC2626" 
              radius={[0, 4, 4, 0]} 
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-dim text-xs uppercase text-text-secondary font-semibold">
            <tr>
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3 text-right">Variance (CV)</th>
              <th className="px-6 py-3 text-right">CPI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((v) => (
              <tr key={v.id} className="hover:bg-surface-dim/50 transition-colors">
                <td className="px-6 py-3 font-medium text-text-primary">{v.code}</td>
                <td className="px-6 py-3 text-text-secondary truncate max-w-[200px]">{v.description}</td>
                <td className="px-6 py-3 text-right font-medium text-danger">
                  {formatCurrency(v.cv)}
                </td>
                <td className="px-6 py-3 text-right">
                  <span className="bg-danger/10 text-danger px-2 py-0.5 rounded-full text-xs font-semibold">
                    {Number(v.cpi).toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
