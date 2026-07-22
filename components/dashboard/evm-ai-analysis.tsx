'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, Info, AlertCircle, RefreshCw } from 'lucide-react'

type AiResult = {
  sante_globale: 'critique' | 'vigilance' | 'satisfaisante' | 'optimale'
  resume: string
  projection: {
    date_epuisement_budget: string | null
    cout_final_estime: number
    ecart_previsionnel: number
  }
  alertes: { niveau: 'critique' | 'attention' | 'info'; message: string; action: string }[]
  recommandations: string[]
}

export function EvmAiAnalysis({ projectId }: { projectId: string }) {
  const [data, setData] = useState<AiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = async (forceRefresh = false) => {
    // If not forcing, check localStorage cache (1 hour)
    const cacheKey = `ai_evm_${projectId}`
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { timestamp, result } = JSON.parse(cached)
        if (Date.now() - timestamp < 3600000) {
          setData(result)
          return
        }
      }
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      })
      if (!res.ok) {
        let errStr = 'Erreur lors de la génération de l\'analyse'
        try {
          const errData = await res.json()
          if (errData.error) errStr = errData.error
        } catch (e) {}
        throw new Error(errStr)
      }
      const result: AiResult = await res.json()
      setData(result)
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), result }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysis()
  }, [projectId])

  const santeColors = {
    critique: 'bg-red-500/10 text-red-600 border-red-500/20',
    vigilance: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    satisfaisante: 'bg-green-500/10 text-green-600 border-green-500/20',
    optimale: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-surface border border-indigo-100 dark:border-border rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Analyse Intelligente</h2>
        </div>
        <button 
          onClick={() => fetchAnalysis(true)} 
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {loading && !data && (
        <div className="py-8 text-center text-text-secondary animate-pulse">
          L'IA Claude analyse les performances de votre projet...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4">
            <div className={`p-4 rounded-xl border ${santeColors[data.sante_globale]}`}>
              <div className="text-xs font-bold uppercase tracking-wider mb-1">Santé Globale</div>
              <div className="text-lg font-semibold capitalize">{data.sante_globale}</div>
            </div>
            
            <div className="bg-surface-dim p-4 rounded-xl">
              <h3 className="text-sm font-bold text-text-primary mb-2">Projection</h3>
              <p className="text-sm text-text-secondary mb-1">
                <span className="font-medium text-text-primary">Coût estimé (EAC) :</span> {data.projection.cout_final_estime.toLocaleString()} FCFA
              </p>
              <p className="text-sm text-text-secondary mb-1">
                <span className="font-medium text-text-primary">Écart (VAC) :</span> {data.projection.ecart_previsionnel.toLocaleString()} FCFA
              </p>
              {data.projection.date_epuisement_budget && (
                <p className="text-sm text-red-600 font-medium mt-2 bg-red-50 dark:bg-red-900/10 p-2 rounded">
                  ⚠️ Épuisement : {data.projection.date_epuisement_budget}
                </p>
              )}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="text-lg font-medium text-text-primary leading-snug">
              "{data.resume}"
            </div>

            {data.alertes.length > 0 && (
              <div className="space-y-2 mt-4">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" /> Points d'attention
                </h3>
                {data.alertes.map((a, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-surface-dim/50 p-3 rounded-lg">
                    {a.niveau === 'critique' ? <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" /> : <Info className="w-4 h-4 text-orange-400 mt-0.5" />}
                    <div>
                      <p className="text-sm font-medium text-text-primary">{a.message}</p>
                      <p className="text-xs text-text-secondary mt-1"><span className="font-semibold">Action :</span> {a.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <h3 className="text-sm font-bold text-text-primary mb-2">Recommandations de l'IA</h3>
              <ul className="list-disc list-inside space-y-1">
                {data.recommandations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-text-secondary">{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
