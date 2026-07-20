import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PtbaClient } from './ptba-client'
import { getPtbaActivities } from '@/lib/actions/ptba.actions'
import { getLogframe } from '@/lib/actions/logframe.actions'

export const metadata = {
  title: 'PTBA | Gestion de Projets',
  description: 'Plan de Travail et de Budget Annuel'
}

export default async function PtbaPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ year?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params
  const { year: yearParam } = await searchParams

  const currentYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  // 1. Get project details
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) {
    redirect('/projects')
  }

  // 2. Fetch PTBA and Logframe
  const [ptbaActivities, logframeItems] = await Promise.all([
    getPtbaActivities(id, currentYear),
    getLogframe(id)
  ])

  // Filter logframe to only pass "activities" (or everything, but let's pass all to allow selection)
  const logframeActivities = logframeItems.filter(item => item.level === 'activite')

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">PTBA {currentYear}</h1>
          <p className="text-text-secondary mt-1">Plan de Travail et de Budget Annuel pour l'exercice {currentYear}.</p>
        </div>

        <PtbaClient 
          projectId={id} 
          currentYear={currentYear} 
          initialData={ptbaActivities} 
          logframeActivities={logframeActivities}
        />
      </div>
    </div>
  )
}
