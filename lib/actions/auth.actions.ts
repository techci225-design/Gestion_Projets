'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Non authentifié' }
  }

  const name = formData.get('name') as string
  const country = formData.get('country') as string
  const size = formData.get('size') as string

  if (!name || !country || !size) {
    return { error: 'Veuillez remplir tous les champs' }
  }

  let adminClient;
  try {
    adminClient = createAdminClient()
  } catch (err) {
    return { error: 'Erreur configuration serveur' }
  }

  // Generate a basic slug
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000)

  // Insert organization
  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .insert({
      name,
      slug,
      plan: 'trial',
      max_projects: 3,
      is_active: true
    })
    .select('id')
    .single()

  if (orgError || !org) {
    return { error: 'Erreur lors de la création de l\'organisation' }
  }

  // Insert organization_members (owner)
  const { error: memberError } = await adminClient
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      org_role: 'owner'
    })

  if (memberError) {
    return { error: 'Erreur lors de l\'attribution du rôle' }
  }

  return { success: true }
}
