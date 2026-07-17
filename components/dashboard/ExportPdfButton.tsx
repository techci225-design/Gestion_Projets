'use client'

import React, { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'

interface ExportPdfButtonProps {
  projectId: string
}

export function ExportPdfButton({ projectId }: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/export/rapport-complet?projectId=${projectId}`)
      if (!response.ok) {
        throw new Error('Erreur lors de la génération')
      }
      
      const blob = await response.blob()
      
      // Determine filename from response header or default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `Rapport_${projectId}.pdf`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1]
        }
      }
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message)
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-danger animate-in fade-in slide-in-from-right-2">{error}</span>}
      <button 
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 bg-surface border border-border hover:bg-surface-hover text-text-primary px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {loading ? 'Génération...' : '📄 Exporter le rapport (PDF)'}
      </button>
    </div>
  )
}
