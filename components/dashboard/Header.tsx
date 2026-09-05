'use client'

import React from 'react'
import { Bell, Search, Menu, Building2, ChevronDown, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { logout } from '@/app/(auth)/login/actions'
import { NotificationBell } from './NotificationBell'
import { GlobalSearch } from './GlobalSearch'
import { useOrganization } from '@/lib/hooks/useOrganization'

interface HeaderProps {
  title: string
  userFullName?: string
}

export function Header({ title, userFullName }: HeaderProps) {
  const { activeOrganization, organizations, setActiveOrganization, isLoading, isSuperAdmin } = useOrganization()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header className="h-[68px] flex items-center justify-between px-5 lg:px-8 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-10 gap-4 shadow-[0_1px_0_rgba(15,35,60,0.02)]">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="min-w-0">
          <span className="hidden sm:block text-[9px] font-extrabold uppercase tracking-[0.12em] text-orange-600">Smart Project Manager</span>
          <h1 className="text-lg font-bold text-[#0b213b] tracking-tight truncate">{title}</h1>
        </div>
        
        {/* Org Selector */}
        {!isLoading && activeOrganization && organizations.length > 1 && (
          <div className="relative group ml-2 border-l border-slate-200 pl-4 flex items-center shrink-0">
            {isSuperAdmin && (
              <Link href="/admin/organizations" className="mr-4 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-200 transition-colors">
                Admin
              </Link>
            )}
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#123f69] hover:bg-slate-50 transition-colors">
              <Building2 className="w-4 h-4" />
              <span className="font-medium">{activeOrganization.name}</span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
            <div className="absolute top-full left-4 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-[0_16px_40px_rgba(15,35,60,0.14)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden p-1">
              {organizations.map(org => (
                <button
                  key={org.id}
                  onClick={() => setActiveOrganization(org)}
                  className={`w-full text-left px-3 py-2.5 text-xs rounded-lg hover:bg-slate-50 ${org.id === activeOrganization.id ? 'text-[#123f69] font-bold bg-blue-50/70' : 'text-slate-700'}`}
                >
                  {org.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {!isLoading && activeOrganization && organizations.length === 1 && (
          <div className="hidden md:flex items-center gap-4 ml-2 border-l border-slate-200 pl-4">
            {isSuperAdmin && (
              <Link href="/admin/organizations" className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-200 transition-colors">
                Admin
              </Link>
            )}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-xs font-semibold text-slate-500">
              <Building2 className="w-4 h-4" />
              <span>{activeOrganization.name}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {activeOrganization && <GlobalSearch currentOrgId={activeOrganization.id} />}
        <NotificationBell />
        {userFullName && (
          <div className="relative group hidden md:block">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold uppercase cursor-pointer hover:bg-primary/30 transition-colors">
              {userFullName.charAt(0)}
            </div>
            
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-2">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-text-primary truncate">{userFullName}</p>
              </div>
              <div className="py-1">
                <Link href="/settings" className="flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-primary transition-colors">
                  Mon Profil
                </Link>
              </div>
              <div className="border-t border-border py-1">
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors">
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
