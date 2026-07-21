'use client'

import React, { useState } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Briefcase, Target, Activity, Users, FileText, TrendingUp, X, Building2, FolderPlus, Coins, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'

export interface ChecklistState {
  hasOrganization: boolean
  hasProject: boolean
  hasBudget: boolean
  hasOperations: boolean
  hasTasks: boolean
  hasTeamMembers: boolean
  hasPdfReport: boolean
  firstProjectId?: string
}

interface GettingStartedGuideProps {
  state: ChecklistState
}

export function GettingStartedGuide({ state }: GettingStartedGuideProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isVisible, setIsVisible] = useState(true)

  const steps = [
    { id: 'org', title: 'Créer votre organisation', completed: state.hasOrganization, href: '#', icon: Building2 },
    { id: 'proj', title: 'Créer votre premier projet', completed: state.hasProject, href: '#', icon: FolderPlus },
    { id: 'budget', title: 'Ajouter vos lignes budgétaires', completed: state.hasBudget, href: state.firstProjectId ? `/projects/${state.firstProjectId}/budget` : '#', icon: Coins },
    { id: 'ops', title: 'Saisir votre première opération', completed: state.hasOperations, href: state.firstProjectId ? `/projects/${state.firstProjectId}/budget/journal` : '#', icon: FileSpreadsheet },
    { id: 'evm', title: 'Configurer le moteur EVM (tâches)', completed: state.hasTasks, href: state.firstProjectId ? `/projects/${state.firstProjectId}/evm` : '#', icon: Activity },
    { id: 'team', title: 'Inviter un membre de votre équipe', completed: state.hasTeamMembers, href: state.firstProjectId ? `/projects/${state.firstProjectId}/membres` : '#', icon: Users },
    { id: 'pdf', title: 'Générer un rapport PDF', completed: state.hasPdfReport, href: state.firstProjectId ? `/projects/${state.firstProjectId}` : '#', icon: FileText },
  ]

  const completedCount = steps.filter(s => s.completed).length
  const progress = Math.round((completedCount / steps.length) * 100)

  if (!isVisible || completedCount === steps.length) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl shadow-sm mb-6 overflow-hidden relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-indigo-400 hover:text-indigo-600 transition-colors p-1"
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-indigo-400 hover:text-indigo-600 transition-colors p-1"
          title="Masquer le guide"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              🚀 Guide de démarrage
            </h3>
            <p className="text-sm text-indigo-700 mt-1">
              Complétez ces étapes pour configurer votre espace de travail.
            </p>
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 bg-indigo-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-1000 ease-in-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-indigo-800 w-12 text-right">{progress}%</span>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-6">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <Link 
                  key={step.id}
                  href={step.href}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    step.completed 
                      ? 'opacity-60 grayscale bg-transparent' 
                      : 'bg-white shadow-sm border border-indigo-50 hover:border-indigo-200 hover:shadow-md cursor-pointer group'
                  }`}
                >
                  <div className={`p-2 rounded-full ${step.completed ? 'bg-gray-100 text-gray-500' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 group-hover:scale-110 transition-transform'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-sm font-medium flex-1 ${step.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                    {step.title}
                  </span>
                  <div>
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 group-hover:text-indigo-300 transition-colors" />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
