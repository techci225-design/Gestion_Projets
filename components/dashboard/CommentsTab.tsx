'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react'
import { getComments, addComment, updateComment, deleteComment } from '@/lib/actions/comments.actions'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

import { createClient } from '@/lib/supabase/client'

interface CommentsTabProps {
  projectId: string
  relatedTable: string
  relatedId: string
}

export function CommentsTab({ projectId, relatedTable, relatedId }: CommentsTabProps) {
  const [comments, setComments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setCurrentUserId(data.session.user.id)
    })
    loadComments()
  }, [relatedId])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const loadComments = async () => {
    setIsLoading(true)
    const { data } = await getComments(relatedTable, relatedId)
    setComments(data || [])
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    const res = await addComment(projectId, relatedTable, relatedId, newComment)
    if (res.error) {
      alert("Erreur lors de l'ajout: " + res.error)
    } else {
      setComments([...comments, res.data])
      setNewComment('')
    }
    setIsSubmitting(false)
  }

  const handleEditSubmit = async (id: string) => {
    if (!editContent.trim()) return
    
    const res = await updateComment(id, editContent)
    if (res.error) {
      alert("Erreur lors de la modification: " + res.error)
    } else {
      setComments(comments.map(c => c.id === id ? res.data : c))
      setEditingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce commentaire ?')) return
    
    setComments(prev => prev.filter(c => c.id !== id))
    const res = await deleteComment(id)
    if (res.error) {
      alert("Erreur: " + res.error)
      loadComments()
    }
  }

  const startEdit = (comment: any) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
    setOpenMenuId(null)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 text-text-secondary animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary space-y-2">
            <p>Aucun commentaire.</p>
            <p className="text-sm">Soyez le premier à commenter !</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={`flex gap-4 ${comment.author_id === currentUserId ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                {comment.profiles?.first_name?.charAt(0) || 'U'}
              </div>
              
              <div className={`flex flex-col max-w-[80%] ${comment.author_id === currentUserId ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-medium text-text-secondary">
                    {comment.profiles ? `${comment.profiles.first_name} ${comment.profiles.last_name}` : 'Utilisateur'}
                  </span>
                  <span className="text-[10px] text-text-tertiary">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                
                <div className={`relative group px-4 py-2.5 rounded-2xl text-sm shadow-sm
                  ${comment.author_id === currentUserId 
                    ? 'bg-primary text-white rounded-tr-sm' 
                    : 'bg-white border border-border text-text-primary rounded-tl-sm'
                  }`}
                >
                  {editingId === comment.id ? (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded p-2 text-inherit focus:outline-none focus:ring-1 focus:ring-white/50 resize-none"
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="text-xs opacity-70 hover:opacity-100 transition-opacity">Annuler</button>
                        <button onClick={() => handleEditSubmit(comment.id)} className="text-xs font-bold hover:opacity-80 transition-opacity">Enregistrer</button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                  )}

                  {comment.author_id === currentUserId && !editingId && (
                    <div className="absolute top-1 right-[-28px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === comment.id ? null : comment.id)}
                          className="p-1 text-text-tertiary hover:text-text-primary rounded"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === comment.id && (
                          <div className="absolute right-0 mt-1 w-32 bg-white border border-border rounded-lg shadow-lg z-10 py-1 overflow-hidden">
                            <button 
                              onClick={() => startEdit(comment)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-hover flex items-center gap-2"
                            >
                              <Edit2 className="w-3 h-3" /> Modifier
                            </button>
                            <button 
                              onClick={() => handleDelete(comment.id)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
                            >
                              <Trash2 className="w-3 h-3" /> Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {comment.updated_at !== comment.created_at && !editingId && (
                  <span className="text-[10px] text-text-tertiary mt-1 italic">modifié</span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Écrivez un commentaire..."
            className="flex-1 bg-surface-dim border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none transition-all"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button 
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="flex-shrink-0 self-end p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
        <p className="text-[10px] text-text-tertiary text-center mt-2">Appuyez sur Entrée pour envoyer, Maj+Entrée pour un saut de ligne.</p>
      </div>
    </div>
  )
}
