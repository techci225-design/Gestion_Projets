'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Upload, File as FileIcon, X, Download, Loader2, FileText, FileSpreadsheet, Image as ImageIcon } from 'lucide-react'
import { getAttachments, uploadAttachment, deleteAttachment } from '@/lib/actions/attachments.actions'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AttachmentsTabProps {
  projectId: string
  relatedTable: string
  relatedId: string
}

export function AttachmentsTab({ projectId, relatedTable, relatedId }: AttachmentsTabProps) {
  const [attachments, setAttachments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setCurrentUserId(data.session.user.id)
    })
    loadAttachments()
  }, [relatedId])

  const loadAttachments = async () => {
    setIsLoading(true)
    const { data } = await getAttachments(relatedTable, relatedId)
    setAttachments(data || [])
    setIsLoading(false)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    if (!allowedTypes.includes(file.type)) {
      alert("Format non supporté. Veuillez uploader un PDF, JPG, PNG ou XLSX.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Le fichier dépasse la limite de 10 Mo.")
      return
    }

    setIsUploading(true)
    
    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${projectId}/${relatedTable}/${relatedId}/${Date.now()}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file)

    if (uploadError) {
      alert("Erreur lors de l'upload du fichier: " + uploadError.message)
      setIsUploading(false)
      return
    }

    // Save to database
    const res = await uploadAttachment(
      projectId,
      relatedTable,
      relatedId,
      file.name,
      file.size,
      file.type,
      filePath
    )

    if (res.error) {
      alert("Erreur lors de l'enregistrement: " + res.error)
      // Cleanup storage
      await supabase.storage.from('attachments').remove([filePath])
    } else {
      setAttachments([res.data, ...attachments])
    }

    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce document ?')) return
    
    setAttachments(prev => prev.filter(a => a.id !== id))
    const res = await deleteAttachment(id)
    if (res.error) {
      alert("Erreur: " + res.error)
      loadAttachments() // reload to restore
    }
  }

  const handleDownload = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from('attachments').createSignedUrl(path, 3600)
    if (error) {
      alert("Erreur: Impossible de générer le lien de téléchargement.")
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />
    if (type.includes('image')) return <ImageIcon className="w-8 h-8 text-blue-500" />
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-8 h-8 text-green-500" />
    return <FileIcon className="w-8 h-8 text-gray-500" />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Upload Zone */}
      <div 
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-surface-dim hover:bg-surface'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.xlsx"
          onChange={handleChange}
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-sm font-medium text-text-primary">Téléchargement en cours...</p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-text-primary text-center mb-1">
              Glissez et déposez vos documents ici
            </p>
            <p className="text-xs text-text-secondary text-center mb-4">
              PDF, JPG, PNG, XLSX (max 10 Mo)
            </p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Parcourir les fichiers
            </button>
          </>
        )}
      </div>

      {/* Files List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary">
          Documents joints ({attachments.length})
        </h3>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 text-text-secondary animate-spin" />
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-text-secondary italic text-center p-8 bg-surface-dim rounded-lg">
            Aucun document pour le moment.
          </p>
        ) : (
          <div className="space-y-3">
            {attachments.map((file) => (
              <div key={file.id} className="flex items-center gap-4 p-4 bg-white border border-border rounded-xl shadow-sm hover:border-primary/30 transition-colors">
                <div className="flex-shrink-0">
                  {getFileIcon(file.file_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate" title={file.file_name}>
                    {file.file_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-text-secondary mt-1">
                    <span>{formatSize(file.file_size)}</span>
                    <span>•</span>
                    <span>{format(new Date(file.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                    <span>•</span>
                    <span className="truncate max-w-[150px]">
                      Ajouté par {file.profiles ? `${file.profiles.first_name} ${file.profiles.last_name}` : 'Utilisateur'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(file.storage_path, file.file_name)}
                    className="p-2 text-text-secondary hover:text-primary bg-surface-dim hover:bg-primary/10 rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {(file.uploaded_by === currentUserId) && (
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-2 text-text-secondary hover:text-red-600 bg-surface-dim hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
