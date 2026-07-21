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
    .select('id, full_name, email, phone, notif_email_alerts, notif_email_weekly, notif_push_critical')
    .eq('id', user.id)
    .single()

  // Vérifier si owner d'au moins un projet
  const { data: ownerRole } = await supabase
    .from('project_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1)

  const isOwner = !!(ownerRole && ownerRole.length > 0)

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
        <SettingsClient profile={profile} isOwner={isOwner} />
      </div>
    </>
  )
}
