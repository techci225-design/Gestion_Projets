import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'
import { PtbaClient, PtbaActivity } from './ptba-client'

export default async function PtbaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ptbaActivities, error } = await supabase
    .from('ptba_activities')
    .select('*')
    .eq('project_id', id)
    .order('code', { ascending: true })

  if (error) {
    return (
      <div className="p-6">
        <Header title="PTBA — Plan de Travail et Budget Annuel" />
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          Erreur de chargement: {error.message}
        </div>
      </div>
    )
  }

  const items = ptbaActivities as PtbaActivity[]

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center px-6 py-4">
        <Header title="PTBA — Plan de Travail et Budget Annuel" />
      </div>
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        <PtbaClient items={items} projectId={id} />
      </div>
    </div>
  )
}
