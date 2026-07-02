'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddRisqueModal } from './add-risque-modal'

export function RisquesClient({ projectId, risks }: { projectId: string, risks: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Criticality: 9 = Critical, 6-8 = High, 3-4 = Medium, 1-2 = Low
  const criticalCount = risks.filter(r => r.criticality === 9).length
  const highCount = risks.filter(r => r.criticality >= 6 && r.criticality < 9).length
  const medCount = risks.filter(r => r.criticality >= 3 && r.criticality <= 4).length
  const lowCount = risks.filter(r => r.criticality <= 2).length

  // Heatmap rendering helpers
  const getRiskPoints = (prob: number, imp: number) => {
    return risks.filter(r => r.probability === prob && r.impact === imp)
  }

  const renderCell = (prob: number, imp: number, bgClass: string, roundedClass: string) => {
    const cellRisks = getRiskPoints(prob, imp)
    return (
      <div className={`relative transition-all duration-200 hover:scale-[1.02] hover:z-10 hover:shadow-md ${bgClass} ${roundedClass}`}>
        {cellRisks.map((r, i) => {
          // simple distribution of points
          const top = `${20 + (i % 3) * 20}%`
          const left = `${20 + Math.floor(i / 3) * 25}%`
          const pointBg = r.criticality >= 6 ? 'bg-primary' : (r.criticality <= 2 ? 'bg-secondary' : 'bg-primary')
          
          return (
            <div 
              key={r.id} 
              className={`absolute w-6 h-6 rounded-full flex items-center justify-center font-semibold text-[10px] text-white shadow-sm cursor-pointer transition-transform hover:scale-125 ${pointBg}`}
              style={{ top, left }}
              title={`${r.description} (Criticité: ${r.criticality})`}
            >
              R{r.id.substring(0,2)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Matrice des Risques</h1>
          <p className="text-text-secondary">Analyse et évaluation de la criticité des risques du projet en cours.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white text-sm px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouveau Risque
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Heatmap Section */}
        <section className="lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-border">
          <h2 className="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
            Heatmap d'Évaluation
          </h2>
          <div className="relative w-full max-w-2xl mx-auto mt-8 mb-4">
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-medium text-text-secondary whitespace-nowrap">
              Impact (Y)
            </div>
            <div className="absolute -left-6 top-0 bottom-8 flex flex-col justify-around text-center text-sm font-medium text-text-secondary">
              <span>3</span>
              <span>2</span>
              <span>1</span>
            </div>
            
            <div className="grid grid-cols-3 grid-rows-3 gap-1 h-80 ml-4 mb-4 relative bg-surface-dim">
              {/* Row 1 (Impact 3) */}
              {renderCell(1, 3, 'bg-[#fde68a]', 'rounded-tl-lg')}
              {renderCell(2, 3, 'bg-[#fed7aa]', '')}
              {renderCell(3, 3, 'bg-[#f87171]', 'rounded-tr-lg')}
              
              {/* Row 2 (Impact 2) */}
              {renderCell(1, 2, 'bg-[#fef3c7]', '')}
              {renderCell(2, 2, 'bg-[#fde68a]', '')}
              {renderCell(3, 2, 'bg-[#fca5a5]', '')}
              
              {/* Row 3 (Impact 1) */}
              {renderCell(1, 1, 'bg-[#d1fae5]', 'rounded-bl-lg')}
              {renderCell(2, 1, 'bg-[#fef3c7]', '')}
              {renderCell(3, 1, 'bg-[#fde68a]', 'rounded-br-lg')}
            </div>

            <div className="flex justify-around ml-4 text-center text-sm font-medium text-text-secondary">
              <span className="w-1/3">1</span>
              <span className="w-1/3">2</span>
              <span className="w-1/3">3</span>
            </div>
            <div className="text-center text-sm font-medium text-text-secondary mt-2 ml-4">
              Probabilité (X)
            </div>
          </div>
        </section>

        {/* Summary Stats Section */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-error-container rounded-xl p-4 shadow-sm border border-error/20 flex-1 flex flex-col justify-center">
            <h3 className="text-xs font-semibold text-on-error-container uppercase tracking-wider mb-2">Risques Critiques</h3>
            <div className="text-4xl font-bold text-on-error-container mb-1">{criticalCount}</div>
            <p className="text-xs text-on-error-container/80">Nécessite une action immédiate (Score 9)</p>
          </div>
          <div className="bg-tertiary-fixed rounded-xl p-4 shadow-sm border border-tertiary/10 flex-1 flex flex-col justify-center">
            <h3 className="text-xs font-semibold text-on-tertiary-container uppercase tracking-wider mb-2">Risques Élevés</h3>
            <div className="text-4xl font-bold text-on-tertiary-container mb-1">{highCount}</div>
            <p className="text-xs text-on-tertiary-container/80">Surveillance accrue requise (Score 6-8)</p>
          </div>
          <div className="bg-surface-variant rounded-xl p-4 shadow-sm border border-outline-variant flex-1 flex flex-col justify-center">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Risques Modérés</h3>
            <div className="text-4xl font-bold text-primary mb-1">{medCount}</div>
            <p className="text-xs text-primary/80">À gérer en routine (Score 3-4)</p>
          </div>
          <div className="bg-secondary-container rounded-xl p-4 shadow-sm border border-secondary/20 flex-1 flex flex-col justify-center">
            <h3 className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider mb-2">Risques Faibles</h3>
            <div className="text-4xl font-bold text-on-secondary-container mb-1">{lowCount}</div>
            <p className="text-xs text-on-secondary-container/80">Acceptables (Score 1-2)</p>
          </div>
        </section>
      </div>

      {/* Registry Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-semibold text-primary">Registre des Risques</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-dim border-b border-border">
                <th className="p-4 text-xs font-semibold text-text-secondary">Code</th>
                <th className="p-4 text-xs font-semibold text-text-secondary">Catégorie</th>
                <th className="p-4 text-xs font-semibold text-text-secondary">Description</th>
                <th className="p-4 text-xs font-semibold text-text-secondary">Prob.</th>
                <th className="p-4 text-xs font-semibold text-text-secondary">Impact</th>
                <th className="p-4 text-xs font-semibold text-text-secondary">Criticité</th>
                <th className="p-4 text-xs font-semibold text-text-secondary">Stratégie d'atténuation</th>
                <th className="p-4 text-xs font-semibold text-text-secondary">Statut</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {risks.map((r, index) => {
                let critBadge = 'bg-secondary-container text-on-secondary-container'
                if (r.criticality === 9) critBadge = 'bg-error text-white'
                else if (r.criticality >= 6) critBadge = 'bg-tertiary-fixed text-on-tertiary-container'
                else if (r.criticality >= 3) critBadge = 'bg-surface-variant text-primary'

                return (
                  <tr key={r.id} className={`border-b border-border hover:bg-surface-bright transition-colors h-14 ${index % 2 !== 0 ? 'bg-surface-dim/30' : ''}`}>
                    <td className="p-4 font-medium">R{r.id.substring(0,2)}</td>
                    <td className="p-4">{r.category}</td>
                    <td className="p-4 font-medium">{r.description}</td>
                    <td className="p-4">{r.probability}</td>
                    <td className="p-4">{r.impact}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-bold text-xs ${critBadge}`}>
                        {r.criticality}
                      </span>
                    </td>
                    <td className="p-4 text-text-secondary">{r.mitigation_strategy || '-'}</td>
                    <td className="p-4">
                      <span className="capitalize bg-surface-dim text-primary text-xs px-2 py-1 rounded">
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {risks.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-secondary">Aucun risque enregistré</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddRisqueModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} projectId={projectId} />
    </div>
  )
}
