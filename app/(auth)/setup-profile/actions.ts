'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function completeAccountProfile(input: {
  firstName: string
  lastName: string
  password: string
}) {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()

  if (!firstName || !lastName) {
    return { error: 'Renseignez votre prénom et votre nom.' }
  }
  if (input.password.length < 8) {
    return { error: 'Le mot de passe doit contenir au moins 8 caractères.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    return { error: 'Votre session a expiré. Reconnectez-vous pour continuer.' }
  }

  const fullName = `${firstName} ${lastName}`
  const { error: updateAuthError } = await supabase.auth.updateUser({
    password: input.password,
    data: {
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
    },
  })

  if (updateAuthError) {
    return { error: 'Impossible de sécuriser votre compte. Veuillez réessayer.' }
  }

  const adminClient = createAdminClient()
  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: user.id,
    email: user.email,
    full_name: fullName,
  })

  if (profileError) {
    console.error('Profile completion error:', profileError)
    return { error: 'Le profil n’a pas pu être enregistré. Veuillez réessayer.' }
  }

  return { success: true }
}
