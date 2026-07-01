'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format-currency'

interface SCurveData {
  name: string
  pv: number
  ev: number
  ac: number
}

interface SCurveChartProps {
  data: SCurveData[]
}

export function SCurveChart({ data }: SCurveChartProps) {
  return (
    <div className="w-full h-80 bg-surface p-4 rounded-lg shadow-sm border border-border">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Courbe en S (PV, EV, AC)
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 40,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EEFF" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#43474E', fontSize: 12 }} 
            axisLine={{ stroke: '#E5EEFF' }}
            tickLine={false}
          />
          <YAxis 
            tickFormatter={(value) => new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}
            tick={{ fill: '#43474E', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            formatter={(value: any) => formatCurrency(Number(value))}
            contentStyle={{ borderRadius: '8px', border: '1px solid #E5EEFF', boxShadow: '0px 4px 6px rgba(0,0,0,0.05)' }}
            labelStyle={{ color: '#0B1C30', fontWeight: '600', marginBottom: '4px' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Line
            type="monotone"
            dataKey="pv"
            name="Valeur Planifiée (PV)"
            stroke="#1E3A5F"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="ac"
            name="Coût Réel (AC)"
            stroke="#F59E0B"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="ev"
            name="Valeur Acquise (EV)"
            stroke="#16A34A"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
