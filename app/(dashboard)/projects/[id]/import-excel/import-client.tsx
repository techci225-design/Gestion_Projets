'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Upload, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { parseExcelHeaders, executeImport } from '@/lib/actions/import.actions'

const APP_FIELDS = [
  { value: 'ignore', label: 'Ignorer cette colonne' },
  { value: 'code', label: 'Code Tâche' },
  { value: 'description', label: 'Description' },
  { value: 'budget_planned', label: 'Budget Alloué' },
  { value: 'responsible', label: 'Responsable' },
  { value: 'start_date', label: 'Date début' },
  { value: 'end_date', label: 'Date fin' },
  { value: 'progress_percentage', label: '% Avancement' },
  { value: 'cost_actual', label: 'Coût Réel' }
]

const REQUIRED_FIELDS = ['code', 'description', 'budget_planned']

export function ImportClient({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  
  // mapping: { "Excel Header Name": "db_field_name" }
  const [mapping, setMapping] = useState<Record<string, string>>({})
  
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ importedRows: number, ignoredRows: number, errorRows: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0])
    }
  }

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError('Seuls les fichiers .xlsx et .xls sont acceptés.')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('La taille du fichier ne doit pas dépasser 10 Mo.')
      return
    }
    setError(null)
    setFile(selectedFile)
    setIsParsing(true)

    const formData = new FormData()
    formData.append('file', selectedFile)

    const res = await parseExcelHeaders(formData)
    if (res.error) {
      setError(res.error)
      setIsParsing(false)
      return
    }

    if (res.headers) {
      setHeaders(res.headers)
      // Auto-mapping basique
      const initialMapping: Record<string, string> = {}
      res.headers.forEach(h => {
        const hLow = h.toLowerCase()
        if (hLow.includes('code')) initialMapping[h] = 'code'
        else if (hLow.includes('desc') || hLow.includes('nom') || hLow.includes('titre')) initialMapping[h] = 'description'
        else if (hLow.includes('budget') || hLow.includes('montant')) initialMapping[h] = 'budget_planned'
        else if (hLow.includes('resp')) initialMapping[h] = 'responsible'
        else if (hLow.includes('début') || hLow.includes('debut')) initialMapping[h] = 'start_date'
        else if (hLow.includes('fin')) initialMapping[h] = 'end_date'
        else if (hLow.includes('avanc') || hLow.includes('%')) initialMapping[h] = 'progress_percentage'
        else if (hLow.includes('réel') || hLow.includes('reel') || hLow.includes('depense')) initialMapping[h] = 'cost_actual'
        else initialMapping[h] = 'ignore' // default to ignore
      })
      setMapping(initialMapping)
      setStep(2)
    }
    setIsParsing(false)
  }

  const handleMappingChange = (header: string, field: string) => {
    setMapping(prev => ({ ...prev, [header]: field }))
  }

  // Check if all required fields are mapped to some header
  const mappedFields = Object.values(mapping)
  const isMappingValid = REQUIRED_FIELDS.every(req => mappedFields.includes(req))

  const handleConfirmImport = async () => {
    if (!file) return
    setIsImporting(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await executeImport(projectId, formData, mapping)
    if (res.error) {
      setError(res.error)
      setIsImporting(false)
      return
    }

    if (res.data?.success) {
      setImportResult(res.data.summary)
      setStep(3)
    }
    setIsImporting(false)
  }

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
      {/* Wizard Progress */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((s, idx) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex flex-col items-center flex-1`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${step > s ? 'bg-success-green text-white' : 
                  step === s ? 'bg-primary-container text-on-primary-container' : 
                  'bg-surface-variant text-on-surface-variant'}`}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className={`text-xs mt-2 font-medium ${step >= s ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                {s === 1 ? 'Charger' : s === 2 ? 'Correspondance' : 'Confirmation'}
              </span>
            </div>
            {idx < 2 && (
              <div className={`h-1 flex-1 mx-2 rounded-full ${step > s ? 'bg-success-green' : 'bg-surface-variant'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Étape 1 : Upload */}
      {step === 1 && (
        <div className="text-center py-12 px-6 border-2 border-dashed border-border rounded-xl bg-surface-container-low"
             onDragOver={(e) => e.preventDefault()}
             onDrop={handleFileDrop}>
          <Upload className="w-12 h-12 text-outline mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-on-surface mb-2">Glissez-déposez votre fichier Excel ici</h3>
          <p className="text-sm text-on-surface-variant mb-6">Formats acceptés : .xlsx, .xls (Max 10 Mo)</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".xlsx,.xls" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            className="px-6 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary-fixed-variant transition-colors disabled:opacity-50"
          >
            {isParsing ? 'Analyse en cours...' : 'Parcourir les fichiers'}
          </button>
        </div>
      )}

      {/* Étape 2 : Mapping */}
      {step === 2 && (
        <div>
          <h3 className="text-lg font-semibold text-on-surface mb-4">Correspondance des colonnes</h3>
          <p className="text-sm text-on-surface-variant mb-6">
            L'assistant a détecté les colonnes suivantes. Veuillez vérifier qu'elles correspondent bien aux champs de l'application. 
            Les champs <span className="font-bold">Code Tâche, Description et Budget Alloué</span> sont obligatoires.
          </p>

          <div className="border border-border rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container text-on-surface-variant">
                <tr>
                  <th className="p-3 font-semibold w-1/2">Colonne Excel</th>
                  <th className="p-3 font-semibold w-1/2">Champ de l'application</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {headers.map(header => {
                  const mappedTo = mapping[header]
                  const isIgnored = mappedTo === 'ignore'
                  return (
                    <tr key={header} className={isIgnored ? 'bg-surface-container-low text-on-surface-variant' : 'bg-surface'}>
                      <td className="p-3 flex items-center gap-2">
                        {isIgnored ? (
                          <AlertTriangle className="w-4 h-4 text-warning-orange" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 text-primary" />
                        )}
                        {header}
                      </td>
                      <td className="p-3">
                        <select 
                          value={mappedTo}
                          onChange={(e) => handleMappingChange(header, e.target.value)}
                          className={`w-full p-2 rounded border focus:outline-none focus:border-primary ${isIgnored ? 'border-border bg-surface-container' : 'border-outline-variant bg-surface'}`}
                        >
                          <option value="">-- Sélectionner un champ --</option>
                          {APP_FIELDS.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-4">
            <button 
              onClick={() => { setStep(1); setFile(null); setHeaders([]) }}
              className="px-4 py-2 border border-border rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Annuler
            </button>
            <button 
              onClick={handleConfirmImport}
              disabled={!isMappingValid || isImporting}
              className="px-6 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary-fixed-variant transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isImporting ? 'Importation...' : 'Confirmer l\'import'}
            </button>
          </div>
        </div>
      )}

      {/* Étape 3 : Confirmation */}
      {step === 3 && importResult && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-success-green rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-on-surface mb-2">Importation terminée</h3>
          
          <div className="flex justify-center gap-6 my-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-success-green">{importResult.importedRows}</p>
              <p className="text-sm text-on-surface-variant">Lignes importées</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-warning-orange">{importResult.ignoredRows}</p>
              <p className="text-sm text-on-surface-variant">Lignes ignorées</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-error-red">{importResult.errorRows}</p>
              <p className="text-sm text-on-surface-variant">Erreurs</p>
            </div>
          </div>

          <button 
            onClick={() => router.push(`/projects/${projectId}/ptba`)}
            className="px-6 py-3 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary-fixed-variant transition-colors flex items-center gap-2 mx-auto"
          >
            Voir les données importées
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
