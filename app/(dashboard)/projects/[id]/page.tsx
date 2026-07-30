import React from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'
import { formatCurrency } from '@/lib/utils/format-currency'
import { getDisplayCurrency } from '@/lib/utils/currency'
import { CalendarDays, Wallet, Building2, AlignLeft, BarChart3, Users, Landmark, Clock, FileText } from 'lucide-react'
import { format, differenceInMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const resolvedParams = await params

  // Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (!project) {
    notFound()
  }

  // Fetch funding sources to calculate true total budget
  const { data: fundingSources } = await supabase
    .from('funding_sources')
    .select('amount')
    .eq('project_id', resolvedParams.id)

  const totalFunding = fundingSources?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0
  const displayBudget = totalFunding > 0 ? totalFunding : (project.budget || 0)

  // Fetch user for Header
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id).single()

  const startDate = project.start_date ? new Date(project.start_date) : null
  const endDate = project.end_date ? new Date(project.end_date) : null
  const durationMonths = startDate && endDate ? differenceInMonths(endDate, startDate) : 0

  return (
    <>
      <Header title={`Vue d'ensemble : ${project.name}`} userFullName={profile?.full_name || 'Utilisateur'} />
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-2xl shadow-sm border border-border">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">{project.name}</h1>
            </div>
            <p className="text-text-secondary flex items-center gap-2">
              <span className="font-mono bg-surface-dim px-2 py-0.5 rounded text-sm border border-border">Code: {project.code}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-medium text-text-secondary">Statut du Projet</span>
            <span className="px-3 py-1 bg-success/10 text-success border border-success/20 rounded-full text-sm font-bold shadow-sm">
              {project.status === 'active' ? 'En cours' : project.status}
            </span>
          </div>
        </div>

        {/* Section 1 : Informations Générales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 h-full">
              <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <AlignLeft className="w-5 h-5 text-text-secondary" /> 
                Description & Objectif Central
              </h2>
              <div className="prose prose-sm max-w-none text-text-secondary whitespace-pre-wrap">
                {project.description || "Aucune description fournie pour ce projet."}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Finances */}
            <div className="bg-gradient-to-br from-primary to-blue-700 rounded-2xl shadow-md p-6 text-white relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Wallet className="w-32 h-32" />
              </div>
              <h2 className="text-white/80 text-sm font-medium mb-1">Budget Global</h2>
              <p className="text-3xl font-bold tracking-tight">
                {displayBudget > 0 ? formatCurrency(displayBudget, project.currency) : 'Non défini'}
              </p>
            </div>

            {/* Calendrier */}
            <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
              <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-text-secondary" /> 
                Calendrier
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-surface-dim rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-text-secondary font-medium">Début</p>
                      <p className="text-sm font-bold text-text-primary">
                        {startDate ? format(startDate, 'dd MMMM yyyy', { locale: fr }) : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary font-medium">Fin</p>
                    <p className="text-sm font-bold text-text-primary">
                      {endDate ? format(endDate, 'dd MMMM yyyy', { locale: fr }) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-sm font-medium text-text-secondary">Durée estimée</span>
                  <span className="text-sm font-bold text-primary">{durationMonths} mois</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 : Gouvernance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex items-start gap-4 hover:border-primary/30 transition-colors">
            <div className="p-3 bg-amber-50 rounded-xl">
              <Landmark className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-1">Financement / Bailleur</h3>
              <p className="text-lg font-bold text-text-primary">
                {project.funder || "Non défini"}
              </p>
            </div>
          </div>
          
          <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex items-start gap-4 hover:border-primary/30 transition-colors">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-1">Maître d'œuvre</h3>
              <p className="text-lg font-bold text-text-primary">
                {project.implementing_agency || "Non défini"}
              </p>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
