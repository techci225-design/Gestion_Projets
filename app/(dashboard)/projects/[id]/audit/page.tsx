import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuditClient } from './audit-client'
import { requireRole } from '@/lib/actions/auth.actions'

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
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

  try {
    // Only owner and chef_projet can view audit logs
    await requireRole(id, ['owner', 'chef_projet'])
  } catch (err) {
    redirect(`/projects/${id}`)
  }

  // Join profiles to get the user name
  const { data: logs } = await supabase
    .from('audit_log')
    .select('*, profiles(email, full_name)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(100) // Paginate or limit to last 100 for now

  return (
    <div className="pb-24 md:pb-6 bg-background-main">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-on-surface mb-2">Journal d'Audit</h1>
          <p className="text-on-surface-variant">Traceabilité complète des actions effectuées sur le projet.</p>
        </div>
        
        <AuditClient projectId={id} initialLogs={logs || []} />
      </div>
    </div>
  )
}
