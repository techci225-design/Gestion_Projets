import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AlertBadge } from '@/components/ui/AlertBadge'
import { Plus, Briefcase, Calendar } from 'lucide-react'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id)
    .single()

  // Fetch projects for this user
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (projectsError) {
    console.error('Projects Error:', projectsError)
  }

  // Fetch EVM summaries for all projects
  const { data: evmSummaries } = await supabase
    .from('v_evm_project_summary')
    .select('*')

  // We could also aggregate v_budget_consumption to show budget consumed, but EVM AC gives the total actual cost.
  
  return (
    <>
      <Header title="Mes Projets" userFullName={profile?.full_name || 'Utilisateur'} />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Portefeuille</h2>
          <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Nouveau Projet
          </button>
        </div>

        {projectsError ? (
          <div className="p-4 bg-danger/10 text-danger rounded-md border border-danger/20">
            Erreur lors du chargement des projets: {projectsError.message}
          </div>
        ) : projects?.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-surface border border-border rounded-lg border-dashed">
            <Briefcase className="w-12 h-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">Aucun projet trouvé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.map((project) => {
              const summary = evmSummaries?.find(s => s.project_id === project.id)
              const bac = summary?.bac_total || 0
              const ac = summary?.ac_total || 0
              const cpi = summary?.cpi_global || 1
              const spi = summary?.spi_global || 1
              const progress = bac > 0 ? (ac / bac) * 100 : 0

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="bg-surface rounded-lg shadow-sm border border-border p-5 hover:border-primary/50 transition-colors cursor-pointer flex flex-col h-full group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1 block">
                          {project.code || 'SANS CODE'}
                        </span>
                        <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-2">
                          {project.name}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        project.status === 'actif' ? 'bg-success/10 text-success' : 
                        project.status === 'clos' ? 'bg-text-tertiary/10 text-text-secondary' : 
                        'bg-warning/10 text-warning'
                      }`}>
                        {project.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-text-secondary mb-6">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {project.start_date ? new Date(project.start_date).getFullYear() : 'N/A'} - {project.end_date ? new Date(project.end_date).getFullYear() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">Consommation ({progress.toFixed(0)}%)</span>
                          <span className="font-semibold">{formatCurrency(ac)}</span>
                        </div>
                        <div className="w-full bg-surface-dim rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${progress >= 100 ? 'bg-danger' : progress >= 80 ? 'bg-warning' : 'bg-primary'}`} 
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <div className="text-right text-xs text-text-tertiary">
                          sur {formatCurrency(bac)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-4 border-t border-border">
                        <AlertBadge value={cpi} type="cpi" />
                        <AlertBadge value={spi} type="spi" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
