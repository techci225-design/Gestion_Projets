import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MembresClient } from './membres-client'

export default async function MembresPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Join profiles to get email/full_name
  const { data: members } = await supabase
    .from('project_members')
    .select('*, profiles(email, full_name)')
    .eq('project_id', id)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .order('email')

  return (
    <MembresClient 
      projectId={id} 
      members={members || []} 
      allProfiles={profiles || []}
    />
  )
}
