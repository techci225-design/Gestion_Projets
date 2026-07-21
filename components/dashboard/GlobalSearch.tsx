'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, Loader2, Clock, MapPin, Briefcase, AlertTriangle, ListTodo, X } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export function GlobalSearch({ currentOrgId }: { currentOrgId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<any[]>([])
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    // Keyboard shortcut CMD+K / CTRL+K
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (e) {}
    }
    
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    } else if (!isOpen) {
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query)
      } else {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true)
    const { data, error } = await supabase.rpc('search_global', {
      query_text: searchQuery,
      org_id: currentOrgId
    })
    if (!error && data) {
      setResults(data)
    }
    setIsSearching(false)
  }

  const handleSelect = (item: any) => {
    // Save to recent
    const newRecent = [item, ...recentSearches.filter(i => i.title !== item.title)].slice(0, 5)
    setRecentSearches(newRecent)
    localStorage.setItem('recentSearches', JSON.stringify(newRecent))
    
    setIsOpen(false)
    
    // Navigate based on type
    if (item.type === 'operation') {
      router.push(`/projects/${item.project_id}/budget/journal`)
    } else if (item.type === 'marche') {
      router.push(`/projects/${item.project_id}/marches`)
    } else if (item.type === 'risque') {
      router.push(`/projects/${item.project_id}/risques`)
    } else if (item.type === 'tache_evm') {
      router.push(`/projects/${item.project_id}/parametres`)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'operation': return <Briefcase className="w-5 h-5 text-blue-500" />
      case 'marche': return <ListTodo className="w-5 h-5 text-purple-500" />
      case 'risque': return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'tache_evm': return <MapPin className="w-5 h-5 text-green-500" />
      default: return <Search className="w-5 h-5 text-gray-500" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'operation': return 'Opération'
      case 'marche': return 'Marché'
      case 'risque': return 'Risque'
      case 'tache_evm': return 'Tâche WBS'
      default: return type
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface-dim border border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors w-48 lg:w-64"
      >
        <Search className="w-4 h-4" />
        <span className="text-sm flex-1 text-left">Rechercher...</span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-white border border-border rounded text-text-tertiary shadow-sm hidden sm:inline-block">
          ⌘K
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 bg-black/40 backdrop-blur-sm">
          <div 
            className="absolute inset-0" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-border/50 animate-in fade-in zoom-in-95 duration-200">
            {/* Search Input */}
            <div className="flex items-center px-4 py-3 border-b border-border bg-white">
              <Search className={`w-5 h-5 mr-3 ${isSearching ? 'text-primary' : 'text-text-secondary'}`} />
              <input
                ref={searchInputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher une opération, marché, risque..."
                className="flex-1 bg-transparent border-none outline-none text-lg text-text-primary placeholder:text-text-tertiary"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="p-1 text-text-tertiary hover:text-text-primary rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-surface-dim p-2">
              {query.trim().length >= 2 ? (
                // Results
                isSearching && results.length === 0 ? (
                  <div className="p-8 flex justify-center items-center text-text-secondary gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Recherche en cours...
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Résultats
                    </div>
                    {results.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelect(item)}
                        className="w-full flex items-start gap-4 p-3 bg-white hover:bg-primary/5 rounded-lg border border-transparent hover:border-primary/20 transition-colors text-left"
                      >
                        <div className="mt-0.5 p-1.5 bg-surface-dim rounded-md">
                          {getIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-text-primary truncate">{item.title}</h4>
                          <p className="text-xs text-text-secondary truncate mt-0.5">
                            {getTypeLabel(item.type)} • {item.subtitle}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-text-secondary">
                    Aucun résultat trouvé pour "{query}"
                  </div>
                )
              ) : (
                // Recent Searches
                recentSearches.length > 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center justify-between">
                      <span>Consultés récemment</span>
                      <button 
                        onClick={() => { setRecentSearches([]); localStorage.removeItem('recentSearches') }}
                        className="text-text-tertiary hover:text-danger hover:underline"
                      >
                        Effacer
                      </button>
                    </div>
                    {recentSearches.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelect(item)}
                        className="w-full flex items-center gap-4 p-3 hover:bg-white rounded-lg transition-colors text-left group"
                      >
                        <Clock className="w-4 h-4 text-text-tertiary group-hover:text-primary transition-colors" />
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="text-sm text-text-primary truncate">{item.title}</span>
                          <span className="text-[10px] text-text-tertiary bg-white px-1.5 py-0.5 rounded border border-border">
                            {getTypeLabel(item.type)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-text-tertiary flex flex-col items-center">
                    <Search className="w-8 h-8 mb-3 opacity-20" />
                    <p className="text-sm">Recherchez un élément à travers vos projets</p>
                  </div>
                )
              )}
            </div>
            
            <div className="px-4 py-2 bg-surface border-t border-border flex items-center justify-between text-xs text-text-tertiary">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-border rounded font-sans font-medium text-[10px]">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-white border border-border rounded font-sans font-medium text-[10px]">↓</kbd>
                  pour naviguer
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-border rounded font-sans font-medium text-[10px]">↵</kbd>
                  pour sélectionner
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-border rounded font-sans font-medium text-[10px]">ESC</kbd>
                pour fermer
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
