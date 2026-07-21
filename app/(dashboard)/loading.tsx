import React from 'react'
import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
      <p className="text-text-secondary text-sm font-medium animate-pulse">Chargement en cours...</p>
    </div>
  )
}
