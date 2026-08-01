'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface GaugeCPISPIProps {
  value: number | null | undefined
  label: string
}

export function GaugeCPISPI({ value, label }: GaugeCPISPIProps) {
  // Determine color and status
  let color = '#94A3B8' // slate-400 for empty state
  let status = 'N/A'
  let normalizedValue = 0
  
  if (value !== null && value !== undefined) {
    color = '#DC2626' // danger
    status = 'Critique'
    if (value >= 1) {
      color = '#16A34A' // success
      status = 'Bon'
    } else if (value >= 0.9) {
      color = '#F59E0B' // warning
      status = 'Moyen'
    }
    normalizedValue = Math.min(Math.max(value, 0), 2)
  }

  // Calculate the gauge filling (limit between 0 and 2 for the display scale)
  // We map [0, 2] to [0, 180] degrees
  const percentage = (normalizedValue / 2) * 100
  
  const data = [
    { name: 'Value', value: percentage },
    { name: 'Empty', value: 100 - percentage },
  ]

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-surface rounded-lg shadow-sm border border-border">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{label}</h3>
      <div className="relative w-40 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
            >
              <Cell key="cell-0" fill={color} />
              <Cell key="cell-1" fill="#E5EEFF" /> {/* bg-border */}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {value !== null && value !== undefined ? value.toFixed(2) : '-.--'}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color }}>
            {status}
          </span>
        </div>
      </div>
    </div>
  )
}
