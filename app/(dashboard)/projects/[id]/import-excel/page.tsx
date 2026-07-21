import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ImportClient } from './import-client'

export default async function ImportExcelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    redirect('/projects')
  }

  return (
    <div className="pb-24 md:pb-6 bg-background-main">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-on-surface mb-2">Assistant d'Import Excel</h1>
          <p className="text-on-surface-variant">Importez vos données PTBA depuis un fichier Excel.</p>
        </div>
        
        <ImportClient projectId={id} />
      </div>
    </div>
  )
}
