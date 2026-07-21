import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'
import { LogframeClient, LogframeItem } from './logframe-client'
import { Plus } from 'lucide-react'

export default async function LogframePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: logframeItems, error } = await supabase
    .from('logframe_items')
    .select('*')
    .eq('project_id', id)
    .order('level', { ascending: true })

  if (error) {
    return (
      <div className="p-6">
        <Header title="Cadre Logique" />
        <div className="mt-6 text-danger">Erreur de chargement: {error.message}</div>
      </div>
    )
  }

  const items = logframeItems as LogframeItem[]

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center px-6 py-4">
        <Header title="Cadre Logique" />
      </div>
      <div className="px-6 pb-24 md:pb-6">
        <LogframeClient items={items} projectId={id} />
      </div>
    </div>
  )
}
