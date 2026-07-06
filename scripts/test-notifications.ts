import { createAdminClient } from '../lib/supabase/admin'

async function generateFakeNotifications() {
  const supabase = createAdminClient()

  // get a user and a project
  const { data: user } = await supabase.from('profiles').select('id').limit(1).single()
  const { data: project } = await supabase.from('projects').select('id').limit(1).single()

  if (!user || !project) {
    console.error('No user or project found')
    return
  }

  const notifications = [
    {
      user_id: user.id,
      project_id: project.id,
      type: 'budget_seuil_80',
      title: 'Alerte Budget (80%)',
      body: 'Le projet a consommé 80% de son budget alloué.',
      link: `/projects/${project.id}/budget`,
      is_read: false
    },
    {
      user_id: user.id,
      project_id: project.id,
      type: 'risque_critique',
      title: 'Nouveau Risque Critique',
      body: 'Un nouveau risque de niveau "Critique" a été détecté.',
      link: `/projects/${project.id}/risks`,
      is_read: false
    }
  ]

  for (const n of notifications) {
    const { error } = await supabase.from('notifications').insert(n)
    if (error) {
      console.error('Error inserting notification:', error.message)
    } else {
      console.log('Inserted notification:', n.title)
    }
  }
}

generateFakeNotifications()
