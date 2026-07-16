'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/app/(auth)/login/actions'
import { 
  BriefcaseBusiness, LayoutGrid, Settings, FolderTree, 
  CalendarDays, Wallet, Receipt, TrendingUp, ShoppingCart, 
  AlertTriangle, Users, User, Home, MoreHorizontal, ShieldAlert, X, LogOut
} from 'lucide-react'

interface SidebarProps {
  userFullName: string
}

export function Sidebar({ userFullName }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  // Extract project ID if we are inside a project route
  // e.g., /projects/123/evm
  const segments = pathname.split('/')
  const isProjectRoute = segments[1] === 'projects' && segments.length > 2
  const projectId = isProjectRoute ? segments[2] : null

  const projectLinks = [
    { name: 'Tableau de bord', href: `/projects/${projectId}`, icon: TrendingUp },
    { name: 'Paramètres du projet', href: `/projects/${projectId}/parametres`, icon: Settings },
    { name: 'Cadre Logique', href: `/projects/${projectId}/logframe`, icon: FolderTree },
    { name: 'PTBA', href: `/projects/${projectId}/ptba`, icon: CalendarDays },
    { name: 'Budget', href: `/projects/${projectId}/budget`, icon: Wallet },
    { name: 'Journal des opérations', href: `/projects/${projectId}/budget/journal`, icon: Receipt },
    { name: 'Suivi EVM (Tâches)', href: `/projects/${projectId}/evm`, icon: TrendingUp },
    { name: 'Passation des Marchés', href: `/projects/${projectId}/marches`, icon: ShoppingCart },
    { name: 'Risques', href: `/projects/${projectId}/risques`, icon: AlertTriangle },
    { name: 'Membres', href: `/projects/${projectId}/membres`, icon: Users },
    { name: 'Journal d\'Audit', href: `/projects/${projectId}/audit`, icon: ShieldAlert },
  ]

  const mobileTabs = [
    { name: 'Accueil', href: '/projects', icon: Home },
    { name: 'Budget', href: projectId ? `/projects/${projectId}/budget` : '/projects', icon: Wallet },
    { name: 'EVM', href: projectId ? `/projects/${projectId}/evm` : '/projects', icon: TrendingUp },
    { name: 'Risques', href: projectId ? `/projects/${projectId}/risques` : '/projects', icon: AlertTriangle },
    { name: 'Plus', href: '#', icon: MoreHorizontal },
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-surface border-r border-border h-full fixed left-0 top-0 z-10">
        <div className="p-4 flex items-center gap-2 text-primary border-b border-border/50">
          <BriefcaseBusiness className="w-6 h-6" />
          <Link href="/projects" className="text-xl font-bold tracking-tight">ProjetPilote</Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          
          <div className="space-y-1">
            <Link 
              href="/projects"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/projects' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-dim'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Projets
            </Link>

            {/* Sub-menu if a project is selected */}
            {isProjectRoute && (
              <div className="ml-6 mt-2 space-y-1 border-l-2 border-border pl-2">
                {projectLinks.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isActive ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-surface-dim'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {link.name}
                    </Link>
                  )
                })}
              </div>
            )}

            <Link 
              href="/settings"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith('/settings') ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-dim'
              }`}
            >
              <Settings className="w-4 h-4" />
              Paramètres
            </Link>
          </div>

        </nav>

        <div className="p-4 border-t border-border flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
              {userFullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{userFullName}</p>
              <Link href="/profile" className="text-xs text-text-secondary hover:text-primary transition-colors">Mon Profil</Link>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface border-t border-border flex items-center justify-around pb-safe z-20">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = pathname === tab.href

          if (tab.name === 'Plus') {
            return (
              <button
                key={tab.name}
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex flex-col items-center p-3 flex-1 transition-colors text-text-secondary hover:text-primary"
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{tab.name}</span>
              </button>
            )
          }

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center p-3 flex-1 transition-colors ${
                isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Mobile Menu Bottom Sheet */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative bg-surface rounded-t-2xl pb-safe animate-in slide-in-from-bottom-full duration-200">
             <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-semibold text-on-surface">Plus de modules</h3>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-surface-container"><X className="w-5 h-5 text-on-surface-variant"/></button>
             </div>
             <div className="grid grid-cols-3 gap-4 p-4 max-h-[60vh] overflow-y-auto">
               {projectLinks.filter(pl => !mobileTabs.find(mt => mt.name === pl.name)).map(link => {
                 const LinkIcon = link.icon
                 return (
                  <Link key={link.name} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center p-4 rounded-xl bg-surface-container-low border border-border text-on-surface hover:border-primary transition-colors">
                    <LinkIcon className="w-6 h-6 mb-2 text-primary" />
                    <span className="text-[10px] text-center font-medium">{link.name}</span>
                  </Link>
                 )
               })}
             </div>
          </div>
        </div>
      )}
    </>
  )
}
