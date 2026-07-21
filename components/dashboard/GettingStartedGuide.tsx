'use client'

import React, { useState } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Briefcase, Target, Activity, Users, FileText, TrendingUp, X } from 'lucide-react'
import Link from 'next/link'

interface GettingStartedGuideProps {
  steps: {
    id: string
    title: string
    completed: boolean
    href: string
    icon: React.ElementType
  }[]
}

export function GettingStartedGuide({ steps }: GettingStartedGuideProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isVisible, setIsVisible] = useState(true)

  const completedCount = steps.filter(s => s.completed).length
  const progress = Math.round((completedCount / steps.length) * 100)

  if (!isVisible || completedCount === steps.length) {
    return null
  }

  return (
    <div className="bg-surface border border-primary/20 rounded-xl shadow-sm overflow-hidden mb-8 transition-all">
      <div 
        className="bg-primary/5 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg text-primary">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-sm sm:text-base">🚀 Guide de démarrage — {progress}% complété</h3>
            <div className="w-full bg-surface-dim h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out" 
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
          <button 
            onClick={(e) => {
              e.stopPropagation()
              setIsVisible(false)
            }}
            className="p-1 hover:bg-black/5 rounded-md text-text-tertiary hover:text-text-secondary transition-colors"
            title="Masquer le guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <Link 
                key={step.id} 
                href={step.href}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  step.completed 
                    ? 'bg-success/5 border-success/20 opacity-70 hover:opacity-100' 
                    : 'bg-surface hover:border-primary/40 border-border shadow-sm'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <Circle className="w-5 h-5 text-text-tertiary" />
                  )}
                </div>
                <div>
                  <div className={`font-medium text-sm ${step.completed ? 'text-success line-through' : 'text-text-primary'}`}>
                    {step.title}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
