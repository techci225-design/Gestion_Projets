import React from 'react'
import { Header } from '@/components/dashboard/Header'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient, SettingsProfile } from './settings-client'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = await createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch user profile from DB
  const { data: profileData, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, notification_prefs')
    .eq('id', user.id)
    .single()

  if (error || !profileData) {
    return (
      <div className="p-6">
        <Header title="Paramètres" />
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          Erreur de chargement du profil : {error?.message || 'Profil introuvable'}
        </div>
      </div>
    )
  }

  const profile = profileData as SettingsProfile

  return (
    <>
      <Header title="Paramètres" />
      <div className="p-6 max-w-4xl mx-auto">
        <SettingsClient profile={profile} />
      </div>
    </>
  )
}
