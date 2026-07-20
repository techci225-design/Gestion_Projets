'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, Loader2 } from 'lucide-react'
import { importTasksToExistingProject } from '@/lib/actions/import.actions'

export function ImportTasksButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)

      try {
        // 1. Parser le fichier Excel via le route handler
        const response = await fetch('/api/import-excel', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()
        if (!response.ok || result.error) {
          throw new Error(result.error || "Erreur de parsing")
        }

        // 2. Importer les tâches dans le projet existant
        const importResult = await importTasksToExistingProject(projectId, result.data)
        
        if (importResult.error) {
          throw new Error(importResult.error)
        }

        alert('Tâches importées avec succès !')
        router.refresh()
      } catch (err: any) {
        alert(err.message)
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }
  }

  return (
    <>
      <input 
        type="file" 
        accept=".xlsx,.xls,.csv" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2 bg-surface border border-border text-text-primary px-4 py-2 rounded-lg hover:bg-surface-hover transition-colors text-sm font-medium shadow-sm"
      >
        {isUploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Import...</>
        ) : (
          <><FileUp className="w-4 h-4" /> Importer d'Excel</>
        )}
      </button>
    </>
  )
}
