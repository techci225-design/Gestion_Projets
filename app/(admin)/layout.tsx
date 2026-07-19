import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, Users, BarChart3, LogOut, ArrowLeft } from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    redirect('/projects')
  }

  return (
    <div className="min-h-screen bg-surface-dim flex">
      {/* Super Admin Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 text-primary-50">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="font-bold">TS</span>
            </div>
            <span className="font-bold text-lg tracking-tight">TSBC Admin</span>
          </div>

          <nav className="space-y-1">
            <Link href="/admin/organizations" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 text-white font-medium">
              <Building2 className="w-5 h-5" />
              Organisations
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
              <Users className="w-5 h-5" />
              Utilisateurs
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
              <BarChart3 className="w-5 h-5" />
              Statistiques
            </Link>
          </nav>
        </div>
        
        <div className="mt-auto p-4">
          <Link href="/projects" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4 px-2">
            <ArrowLeft className="w-4 h-4" />
            Retour à l'app client
          </Link>
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="font-medium text-sm truncate">{profile.full_name}</div>
            <div className="text-xs text-gray-400 truncate">{user.email}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  )
}
