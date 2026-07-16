'use client'

import React, { useState } from 'react'
import { CheckCircle2, ArrowRight, FileUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { batchUpdateOperationsFromBank } from '@/lib/actions/budget.actions'
import { useRouter } from 'next/navigation'

interface ParsedRow {
  date: string
  libelle: string
  debit: number
  credit: number
}

interface MatchResult {
  row: ParsedRow
  matchedOperationId: string | null
  confidence: number
}

export function ImportReleveClient({ projectId, operations }: { projectId: string, operations: any[] }) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<{ applied: number, ignored: number, errors: number } | null>(null)

  // Step 1: Client-side simplistic CSV parsing for demo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(l => l.trim().length > 0)
      const data: ParsedRow[] = []
      
      // Assumes simple CSV: Date, Libelle, Debit, Credit (or similar)
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''))
        if (parts.length >= 3) {
          data.push({
            date: parts[0] || '',
            libelle: parts[1] || '',
            debit: parseFloat(parts[2] || '0') || 0,
            credit: parseFloat(parts[3] || '0') || 0,
          })
        }
      }
      autoMatch(data)
      setStep(2)
    }
    reader.readAsText(file)
  }

  // Step 2: Auto Match
  const autoMatch = (data: ParsedRow[]) => {
    const newMatches: MatchResult[] = data.map(row => {
      // Simplistic similarity: check if words from libelle are in operation description
      let bestMatchId = null
      let bestScore = 0

      if (row.debit > 0) {
        const rowWords = row.libelle.toLowerCase().split(/\s+/)
        for (const op of operations) {
          const opWords = (op.description || '').toLowerCase().split(/\s+/)
          let matchCount = 0
          for (const rw of rowWords) {
            if (rw.length > 3 && opWords.some((ow: string) => ow.includes(rw))) {
              matchCount++
            }
          }
          let score = matchCount / Math.max(1, rowWords.length) * 100
          // If amount matches exactly, boost score
          if (op.planned_cost === row.debit) {
            score += 40
          }
          if (score > bestScore) {
            bestScore = score
            bestMatchId = op.id
          }
        }
      }
      
      return {
        row,
        matchedOperationId: bestScore >= 30 ? bestMatchId : null,
        confidence: Math.min(100, Math.round(bestScore))
      }
    })
    setMatches(newMatches)
  }

  const handleMatchChange = (index: number, opId: string) => {
    const newMatches = [...matches]
    newMatches[index].matchedOperationId = opId || null
    newMatches[index].confidence = 100 // Manual override
    setMatches(newMatches)
  }

  // Step 3: Apply
  const handleApply = async () => {
    setIsProcessing(true)
    const updates: { operationId: string, actualCost: number, newStatus: string }[] = []
    
    matches.forEach(m => {
      if (m.matchedOperationId && m.row.debit > 0) {
        const op = operations.find(o => o.id === m.matchedOperationId)
        if (op) {
          updates.push({
            operationId: op.id,
            actualCost: m.row.debit,
            newStatus: 'decaisse' // auto move to decaisse
          })
        }
      }
    })

    if (updates.length > 0) {
      const res = await batchUpdateOperationsFromBank(projectId, updates)
      if (res.error) {
        alert(res.error)
      } else {
        setResults({ applied: updates.length, ignored: matches.length - updates.length, errors: 0 })
        setStep(3)
        router.refresh()
      }
    } else {
      setResults({ applied: 0, ignored: matches.length, errors: 0 })
      setStep(3)
    }
    setIsProcessing(false)
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-primary mb-2">Import de Relevé Bancaire</h2>
        <p className="text-text-secondary mb-8">Rapprochez automatiquement vos dépenses bancaires avec votre journal d'opérations.</p>

        {/* Stepper */}
        <div className="flex items-center mb-8 bg-surface border border-border p-4 rounded-xl shadow-sm">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-text-secondary'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary/20' : 'bg-surface-dim'}`}>1</div>
            <span className="font-medium">Upload</span>
          </div>
          <div className={`h-px w-16 mx-4 ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-text-secondary'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary/20' : 'bg-surface-dim'}`}>2</div>
            <span className="font-medium">Matching</span>
          </div>
          <div className={`h-px w-16 mx-4 ${step >= 3 ? 'bg-primary' : 'bg-border'}`} />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-text-secondary'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-primary/20' : 'bg-surface-dim'}`}>3</div>
            <span className="font-medium">Application</span>
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-border p-12 flex flex-col items-center justify-center border-dashed">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
              <FileUp className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Glissez-déposez votre relevé bancaire</h3>
            <p className="text-text-secondary text-sm mb-6 text-center max-w-md">Formats supportés : .csv (colonnes attendues : Date, Libellé, Débit, Crédit)</p>
            <label className="px-6 py-2.5 bg-primary text-white rounded-lg cursor-pointer font-medium hover:bg-primary/90 transition-colors">
              Sélectionner un fichier
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-border flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-surface-dim flex justify-between items-center">
              <h3 className="font-semibold text-text-primary">Vérification des correspondances ({matches.length} lignes)</h3>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Retour</button>
                <button onClick={handleApply} disabled={isProcessing} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {isProcessing ? 'Application...' : 'Valider le matching'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-dim/50 border-b border-border">
                    <th className="p-3 font-medium text-text-secondary w-24">Date</th>
                    <th className="p-3 font-medium text-text-secondary">Libellé Relevé</th>
                    <th className="p-3 font-medium text-text-secondary text-right w-32">Montant (FCFA)</th>
                    <th className="p-3 font-medium text-text-secondary w-1/3">Opération Journal Proposée</th>
                    <th className="p-3 font-medium text-text-secondary text-center w-24">Confiance</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-surface-bright/50">
                      <td className="p-3 text-text-secondary">{m.row.date}</td>
                      <td className="p-3 font-medium">{m.row.libelle}</td>
                      <td className="p-3 text-right">{m.row.debit > 0 ? formatCurrency(m.row.debit) : '-'}</td>
                      <td className="p-3">
                        {m.row.debit > 0 ? (
                          <select 
                            value={m.matchedOperationId || ''} 
                            onChange={(e) => handleMatchChange(idx, e.target.value)}
                            className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-primary"
                          >
                            <option value="">-- Ignorer (Aucune correspondance) --</option>
                            {operations.map(op => (
                              <option key={op.id} value={op.id}>{op.task_code} - {op.description} ({formatCurrency(op.planned_cost)})</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-text-secondary italic text-xs">Entrée de crédit ignorée</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {m.row.debit > 0 && m.matchedOperationId && (
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                            m.confidence >= 70 ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                          }`}>
                            {m.confidence}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && results && (
          <div className="bg-white rounded-xl shadow-sm border border-border p-12 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-[#16A34A]/10 rounded-full flex items-center justify-center text-[#16A34A] mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-6 text-text-primary">Mise à jour terminée</h3>
            
            <div className="flex gap-8 mb-8 w-full max-w-lg">
              <div className="flex-1 bg-surface-dim p-4 rounded-lg border border-border text-center">
                <p className="text-3xl font-bold text-[#16A34A]">{results.applied}</p>
                <p className="text-sm text-text-secondary font-medium">Lignes appliquées</p>
              </div>
              <div className="flex-1 bg-surface-dim p-4 rounded-lg border border-border text-center">
                <p className="text-3xl font-bold text-[#F59E0B]">{results.ignored}</p>
                <p className="text-sm text-text-secondary font-medium">Lignes ignorées</p>
              </div>
              <div className="flex-1 bg-surface-dim p-4 rounded-lg border border-border text-center">
                <p className="text-3xl font-bold text-[#DC2626]">{results.errors}</p>
                <p className="text-sm text-text-secondary font-medium">Erreurs</p>
              </div>
            </div>

            <button onClick={() => router.push(`/projects/${projectId}/budget/journal`)} className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2 transition-colors">
              Voir le journal mis à jour
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
