import React from 'react'
import { formatCurrency } from '@/lib/utils/format-currency'

type AlertType = 'taux' | 'cpi' | 'spi'

interface AlertBadgeProps {
  value: number
  type: AlertType
}

export function AlertBadge({ value, type }: AlertBadgeProps) {
  let colorClass = ''
  let formattedValue = ''

  if (type === 'taux') {
    // Taux: vert < 80%, orange 80–99%, rouge >= 100%
    if (value < 80) {
      colorClass = 'bg-success/10 text-success border border-success/20'
    } else if (value < 100) {
      colorClass = 'bg-warning/10 text-warning border border-warning/20'
    } else {
      colorClass = 'bg-danger/10 text-danger border border-danger/20'
    }
    formattedValue = `${value.toFixed(1)}%`
  } else {
    // CPI / SPI: vert >= 1, orange 0.90–0.99, rouge < 0.90
    if (value >= 1) {
      colorClass = 'bg-success/10 text-success border border-success/20'
    } else if (value >= 0.9) {
      colorClass = 'bg-warning/10 text-warning border border-warning/20'
    } else {
      colorClass = 'bg-danger/10 text-danger border border-danger/20'
    }
    formattedValue = value.toFixed(2)
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
      {formattedValue}
    </span>
  )
}
