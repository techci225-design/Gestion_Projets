'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export async function createOrganizationOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Non authentifié' }
  }

  const name = formData.get('name') as string
  const country = formData.get('country') as string
  const teamSize = formData.get('team_size') as string

  if (!name) {
    return { error: 'Le nom de l\'organisation est requis' }
  }

  let adminClient
  try {
    adminClient = createAdminClient()
  } catch (err) {
    return { error: 'Erreur de configuration serveur' }
  }

  // Generate unique slug
  let slug = generateSlug(name)
  let uniqueSlug = slug
  let counter = 1
  let slugExists = true

  while (slugExists) {
    const { data } = await adminClient
      .from('organizations')
      .select('id')
      .eq('slug', uniqueSlug)
      .maybeSingle()
    
    if (data) {
      uniqueSlug = `${slug}-${counter}`
      counter++
    } else {
      slugExists = false
    }
  }

  // Create Organization
  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .insert({
      name,
      slug: uniqueSlug,
      plan: 'trial',
      max_projects: 3,
      created_by: user.id
    })
    .select()
    .single()

  if (orgError || !org) {
    return { error: 'Erreur lors de la création de l\'organisation' }
  }

  // Add user as owner
  const { error: memberError } = await adminClient
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      org_role: 'owner'
    })

  if (memberError) {
    return { error: 'Erreur lors de l\'ajout du membre' }
  }

  // Create welcome notification
  await adminClient
    .from('notifications')
    .insert({
      organization_id: org.id,
      title: 'Bienvenue sur ProjetPilote !',
      message: 'Votre espace de travail a été créé avec succès. Commencez par créer votre premier projet.',
      type: 'system',
      created_by: user.id
    })

  // Set active organization cookie
  const cookieStore = await cookies()
  cookieStore.set('active_org_id', org.id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return { success: true, organizationId: org.id }
}
