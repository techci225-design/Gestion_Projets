import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { OrganizationProvider } from '@/lib/contexts/OrganizationContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userFullName = profile?.full_name || user.email || 'Utilisateur'

  return (
    <OrganizationProvider>
      <div className="min-h-screen bg-surface-dim md:pl-60 pb-16 md:pb-0">
        <Sidebar userFullName={userFullName} />
        
        {/* We don't render Header here because title varies per page. 
            Pages will include <Header title="..." /> themselves, or we can use a client context. 
            For simplicity, each page renders the Header component itself to have dynamic titles.
        */}
        <main className="w-full h-full min-h-screen">
          {children}
        </main>
      </div>
    </OrganizationProvider>
  )
}
