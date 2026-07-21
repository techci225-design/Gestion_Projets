import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, Info } from 'lucide-react'

export default async function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const resolvedParams = await params
  
  const { data: project } = await supabase
    .from('projects')
    .select('code, organization_id')
    .eq('id', resolvedParams.id)
    .single()

  const isDemo = project?.code === 'DEMO-2026'

  // Check if org has other real projects to hide the banner if they started using the app for real
  let showBanner = false
  if (isDemo && project?.organization_id) {
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', project.organization_id)
      .neq('code', 'DEMO-2026')
    
    showBanner = (count || 0) === 0
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] md:min-h-screen">
      {showBanner && (
        <div className="bg-amber-100 text-amber-900 px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-sm shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-2 mb-2 sm:mb-0">
            <Info className="w-4 h-4 shrink-0" />
            <span className="font-medium">📋 Projet de démonstration — Ces données sont fictives.</span>
          </div>
          <Link 
            href="/projects" 
            className="flex items-center gap-1 font-bold text-amber-900 hover:text-amber-700 transition-colors bg-amber-200/50 hover:bg-amber-200 px-3 py-1 rounded-full"
          >
            Créer mon projet <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
