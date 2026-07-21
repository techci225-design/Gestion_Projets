'use client'

import React from 'react'
import { Bell, Search, Menu, Building2, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { NotificationBell } from './NotificationBell'
import { GlobalSearch } from './GlobalSearch'
import { useOrganization } from '@/lib/hooks/useOrganization'

interface HeaderProps {
  title: string
  userFullName?: string
}

export function Header({ title, userFullName }: HeaderProps) {
  const { activeOrganization, organizations, setActiveOrganization, isLoading, isSuperAdmin } = useOrganization()

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-surface border-b border-border sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-text-primary tracking-tight">{title}</h1>
        
        {/* Org Selector */}
        {!isLoading && activeOrganization && organizations.length > 1 && (
          <div className="relative group ml-4 border-l border-border pl-4 flex items-center">
            {isSuperAdmin && (
              <Link href="/admin/organizations" className="mr-4 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-200 transition-colors">
                Admin
              </Link>
            )}
            <button className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors">
              <Building2 className="w-4 h-4" />
              <span className="font-medium">{activeOrganization.name}</span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
            <div className="absolute top-full left-4 mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {organizations.map(org => (
                <button
                  key={org.id}
                  onClick={() => setActiveOrganization(org)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-hover first:rounded-t-lg last:rounded-b-lg ${org.id === activeOrganization.id ? 'text-primary font-medium bg-primary/5' : 'text-text-primary'}`}
                >
                  {org.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {!isLoading && activeOrganization && organizations.length === 1 && (
          <div className="hidden md:flex items-center gap-4 ml-4 border-l border-border pl-4">
            {isSuperAdmin && (
              <Link href="/admin/organizations" className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-200 transition-colors">
                Admin
              </Link>
            )}
            <div className="flex items-center gap-2 text-sm text-text-tertiary">
              <Building2 className="w-4 h-4" />
              <span>{activeOrganization.name}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {activeOrganization && <GlobalSearch currentOrgId={activeOrganization.id} />}
        <NotificationBell />
        {userFullName && (
          <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold uppercase">
            {userFullName.charAt(0)}
          </div>
        )}
      </div>
    </header>
  )
}
