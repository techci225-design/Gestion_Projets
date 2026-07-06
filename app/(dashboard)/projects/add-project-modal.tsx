'use client'

import React, { useState } from 'react'
import { Plus, X, Trash2, CheckCircle2, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react'
import { createProjectWithBudget } from '@/lib/actions/projects.actions'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils/format-currency'

export function AddProjectModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Step 1: Info
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')

  // Step 2: Funding
  const [fundingSources, setFundingSources] = useState<{ id: string, name: string, type: string, amount: number }[]>([
    { id: '1', name: '', type: 'bailleur', amount: 0 }
  ])

  // Step 3: Budget
  const [budgetLines, setBudgetLines] = useState<{ id: string, code: string, label: string, amount: number, funding_source_id: string }[]>([
    { id: '1', code: '', label: '', amount: 0, funding_source_id: '' }
  ])

  const totalFunding = fundingSources.reduce((acc, curr) => acc + (curr.amount || 0), 0)
  const totalBudget = budgetLines.reduce((acc, curr) => acc + (curr.amount || 0), 0)
  const diff = totalFunding - totalBudget

  // Validations
  const canGoStep2 = name.trim() !== '' && code.trim() !== '' && startDate !== '' && endDate !== ''
  const canGoStep3 = fundingSources.some(fs => fs.name.trim() !== '' && fs.amount > 0)
  const canSubmit = budgetLines.some(bl => bl.code.trim() !== '' && bl.label.trim() !== '' && bl.amount > 0)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const payload = {
        name,
        code,
        start_date: startDate,
        end_date: endDate,
        description,
        funding_sources: fundingSources.filter(fs => fs.name.trim() !== '' && fs.amount > 0),
        budget_lines: budgetLines.filter(bl => bl.code.trim() !== '' && bl.label.trim() !== '' && bl.amount > 0)
      }
      
      const res = await createProjectWithBudget(payload)
      if (res.error) {
        setError(res.error)
      } else if (res.success && res.projectId) {
        // Reset state
        setStep(1)
        setName(''); setCode(''); setStartDate(''); setEndDate(''); setDescription('');
        setFundingSources([{ id: '1', name: '', type: 'bailleur', amount: 0 }])
        setBudgetLines([{ id: '1', code: '', label: '', amount: 0, funding_source_id: '' }])
        setIsOpen(false)
        router.push(`/projects/${res.projectId}/budget?new=true`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addFundingSource = () => {
    setFundingSources([...fundingSources, { id: Date.now().toString(), name: '', type: 'bailleur', amount: 0 }])
  }
  const removeFundingSource = (id: string) => {
    setFundingSources(fundingSources.filter(fs => fs.id !== id))
    // Reset budget lines that were pointing to this source
    setBudgetLines(budgetLines.map(bl => bl.funding_source_id === id ? { ...bl, funding_source_id: '' } : bl))
  }
  const updateFundingSource = (id: string, field: string, value: any) => {
    setFundingSources(fundingSources.map(fs => fs.id === id ? { ...fs, [field]: value } : fs))
  }

  const addBudgetLine = () => {
    setBudgetLines([...budgetLines, { id: Date.now().toString(), code: '', label: '', amount: 0, funding_source_id: '' }])
  }
  const removeBudgetLine = (id: string) => {
    setBudgetLines(budgetLines.filter(bl => bl.id !== id))
  }
  const updateBudgetLine = (id: string, field: string, value: any) => {
    setBudgetLines(budgetLines.map(bl => bl.id === id ? { ...bl, [field]: value } : bl))
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        Nouveau Projet
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-dim">
              <h3 className="font-semibold text-on-surface text-lg">Créer un nouveau projet</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-text-tertiary hover:text-text-primary transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PROGRESS BAR */}
            <div className="bg-surface px-6 py-4 border-b border-border flex justify-between items-center">
              {[
                { num: 1, label: 'Informations' },
                { num: 2, label: 'Financement' },
                { num: 3, label: 'Budget initial' }
              ].map((s, idx) => (
                <div key={s.num} className="flex items-center flex-1 last:flex-none">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border-2
                    ${step > s.num ? 'bg-success border-success text-white' : 
                      step === s.num ? 'bg-primary border-primary text-white' : 
                      'bg-surface border-border text-text-tertiary'}`}>
                    {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${step >= s.num ? 'text-text-primary' : 'text-text-tertiary'}`}>
                    {s.label}
                  </span>
                  {idx < 2 && <div className="flex-1 border-t-2 border-border mx-4" />}
                </div>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-surface-dim/30">
              {error && (
                <div className="mb-6 p-3 bg-danger/10 text-danger text-sm rounded border border-danger/20 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Nom du projet *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: Projet de Réhabilitation Nord" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Code projet *</label>
                    <input type="text" value={code} onChange={e => setCode(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: PRN-2026" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Date de début *</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Date de fin prévue *</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Description (Optionnel)</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Description courte du projet..." />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-text-primary">Qui finance ce projet ?</h4>
                    <p className="text-sm text-text-secondary">Ajoutez au moins une source de financement.</p>
                  </div>
                  
                  {fundingSources.map((fs, idx) => (
                    <div key={fs.id} className="flex items-start gap-3 bg-surface p-4 rounded-lg border border-border shadow-sm">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-text-secondary mb-1">Nom du bailleur</label>
                        <input type="text" value={fs.name} onChange={e => updateFundingSource(fs.id, 'name', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: Banque Mondiale" />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
                        <select value={fs.type} onChange={e => updateFundingSource(fs.id, 'type', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface">
                          <option value="bailleur">Bailleur</option>
                          <option value="contrepartie">Contrepartie État</option>
                          <option value="autre">Autre</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-text-secondary mb-1">Montant engagé (FCFA)</label>
                        <input type="number" min="0" value={fs.amount || ''} onChange={e => updateFundingSource(fs.id, 'amount', Number(e.target.value))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="0" />
                      </div>
                      {fundingSources.length > 1 && (
                        <button onClick={() => removeFundingSource(fs.id)} className="mt-6 p-2 text-text-tertiary hover:text-danger hover:bg-danger/10 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button onClick={addFundingSource} className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                    <Plus className="w-4 h-4" /> Ajouter une source
                  </button>

                  <div className="mt-6 p-4 bg-surface rounded-lg border border-border shadow-sm flex justify-between items-center">
                    <span className="font-semibold text-text-primary">Total du financement :</span>
                    <span className="text-xl font-bold text-success">{formatCurrency(totalFunding)}</span>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-text-primary">Définissez votre budget initial</h4>
                    <p className="text-sm text-text-secondary">Ces montants constituent votre enveloppe de référence.</p>
                  </div>
                  
                  {budgetLines.map((bl, idx) => (
                    <div key={bl.id} className="flex items-start gap-3 bg-surface p-4 rounded-lg border border-border shadow-sm">
                      <div className="w-20">
                        <label className="block text-xs font-medium text-text-secondary mb-1">Code</label>
                        <input type="text" value={bl.code} onChange={e => updateBudgetLine(bl.id, 'code', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="1.1" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-text-secondary mb-1">Libellé</label>
                        <input type="text" value={bl.label} onChange={e => updateBudgetLine(bl.id, 'label', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: Consultants" />
                      </div>
                      <div className="w-40">
                        <label className="block text-xs font-medium text-text-secondary mb-1">Bailleur lié</label>
                        <select value={bl.funding_source_id} onChange={e => updateBudgetLine(bl.id, 'funding_source_id', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface">
                          <option value="">Sélectionner...</option>
                          {fundingSources.filter(fs => fs.name.trim() !== '').map(fs => (
                            <option key={fs.id} value={fs.id}>{fs.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-48">
                        <label className="block text-xs font-medium text-text-secondary mb-1">Montant alloué (FCFA)</label>
                        <input type="number" min="0" value={bl.amount || ''} onChange={e => updateBudgetLine(bl.id, 'amount', Number(e.target.value))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="0" />
                      </div>
                      {budgetLines.length > 1 && (
                        <button onClick={() => removeBudgetLine(bl.id)} className="mt-6 p-2 text-text-tertiary hover:text-danger hover:bg-danger/10 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button onClick={addBudgetLine} className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                    <Plus className="w-4 h-4" /> Ajouter une ligne budgétaire
                  </button>

                  <div className="mt-6 p-4 bg-surface rounded-lg border border-border shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">Financement total déclaré (Étape 2) :</span>
                      <span className="font-semibold">{formatCurrency(totalFunding)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">Budget total saisi :</span>
                      <span className="font-semibold">{formatCurrency(totalBudget)}</span>
                    </div>
                    
                    {diff !== 0 && (
                      <div className="mt-2 p-3 bg-warning/10 text-warning-dark text-sm rounded border border-warning/20 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>⚠️ Écart de <strong>{formatCurrency(Math.abs(diff))}</strong> entre le budget et le financement déclaré.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-between bg-surface-dim">
              {step > 1 ? (
                <button 
                  type="button" 
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 text-sm font-medium text-text-primary bg-surface border border-border hover:bg-surface-hover rounded-lg transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Précédent
                </button>
              ) : <div></div>}

              {step < 3 ? (
                <button 
                  type="button" 
                  disabled={step === 1 ? !canGoStep2 : !canGoStep3}
                  onClick={() => setStep(step + 1)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1"
                >
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  type="button" 
                  disabled={!canSubmit || loading}
                  onClick={handleSubmit}
                  className="px-6 py-2 text-sm font-medium text-white bg-success hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  {loading ? 'Création...' : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Créer le projet
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
