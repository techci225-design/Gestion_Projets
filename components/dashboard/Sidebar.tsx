'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/app/(auth)/login/actions'
import { 
  BriefcaseBusiness, LayoutGrid, Settings, FolderTree, 
  CalendarDays, Wallet, Receipt, TrendingUp, ShoppingCart, 
  AlertTriangle, Users, Home, MoreHorizontal, ShieldAlert, X, LogOut, Landmark, FileUp, ArrowLeft
} from 'lucide-react'

interface SidebarProps {
  userFullName: string
  orgName?: string
  isOrgAdmin?: boolean
}

export function Sidebar({ userFullName, orgName = 'ProjetPilote', isOrgAdmin = false }: SidebarProps) {
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

  const projectGroups = [
    {
      title: 'PROJET',
      links: [
        { name: 'Vue d\'ensemble', href: `/projects/${projectId}`, icon: Home },
        { name: 'Équipe', href: `/projects/${projectId}/membres`, icon: Users },
        { name: 'Configuration', href: `/projects/${projectId}/parametres`, icon: Settings },
      ]
    },
    {
      title: 'PLANIFICATION',
      links: [
        { name: 'Cadre Logique', href: `/projects/${projectId}/logframe`, icon: FolderTree },
        { name: 'WBS / Tâches', href: `/projects/${projectId}/tasks`, icon: LayoutGrid },
        { name: 'Planning', href: `/projects/${projectId}/planning`, icon: CalendarDays },
        { name: 'PTBA', href: `/projects/${projectId}/ptba`, icon: CalendarDays },
      ]
    },
    {
      title: 'FINANCES',
      links: [
        { name: 'Budget', href: `/projects/${projectId}/budget`, icon: Wallet },
        { name: 'Journal des opérations', href: `/projects/${projectId}/budget/journal`, icon: Receipt },
        { name: 'Suivi EVM', href: `/projects/${projectId}/evm`, icon: TrendingUp },
      ]
    },
    {
      title: 'EXÉCUTION & CONTRÔLE',
      links: [
        { name: 'Passation des Marchés', href: `/projects/${projectId}/marches`, icon: ShoppingCart },
        { name: 'Risques', href: `/projects/${projectId}/risques`, icon: AlertTriangle },
        { name: 'Import Relevé', href: `/projects/${projectId}/budget/import-releve`, icon: FileUp },
        { name: 'Journal d\'Audit', href: `/projects/${projectId}/audit`, icon: ShieldAlert },
      ]
    }
  ]

  // Flattened array for mobile
  const projectLinks = projectGroups.flatMap(group => group.links)

  const mobileTabs = [
    { name: 'Accueil', href: '/projects', icon: Home },
    { name: 'Budget', href: projectId ? `/projects/${projectId}/budget` : '#', icon: Wallet, disabled: !projectId },
    { name: 'EVM', href: projectId ? `/projects/${projectId}/evm` : '#', icon: TrendingUp, disabled: !projectId },
    { name: 'Risques', href: projectId ? `/projects/${projectId}/risques` : '#', icon: AlertTriangle, disabled: !projectId },
    { name: 'Plus', href: '#', icon: MoreHorizontal },
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#071827] border-r border-white/5 h-full fixed left-0 top-0 z-20 shadow-[8px_0_30px_rgba(7,24,39,0.08)]">
        <div className="px-5 py-5 flex flex-col gap-1 border-b border-white/10">
          <div className="flex items-center gap-3 text-white">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-white text-orange-600 shadow-sm"><BriefcaseBusiness className="w-5 h-5" /></span>
            <div className="min-w-0"><Link href="/projects" className="block text-base font-bold tracking-tight truncate">{orgName}</Link><span className="block mt-0.5 text-[9px] uppercase tracking-[0.12em] text-slate-400">Gestion de projets</span></div>
          </div>
          {isOrgAdmin && (
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 bg-orange-500/15 text-orange-300 rounded text-[9px] font-bold uppercase tracking-wider">
                Admin
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-5 space-y-2 [scrollbar-width:thin]">
          
          <div className="px-4 space-y-1 mb-4">
            <Link 
              href="/projects"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/projects' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {isProjectRoute ? <ArrowLeft className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              {isProjectRoute ? 'Retour Portefeuille' : 'Tableau de bord'}
            </Link>

            {!isProjectRoute && (
              <Link 
                href="/projects/list"
                className={`flex items-center gap-3 px-3 py-2 mt-1 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/projects/list' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <BriefcaseBusiness className="w-4 h-4" />
                Liste des Projets
              </Link>
            )}
          </div>

          {/* Sub-menu if a project is selected */}
          {isProjectRoute && (
            <div className="px-4 space-y-6 border-t border-white/10 pt-4">
              {projectGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-1">
                  <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.12em] px-3 mb-2">{group.title}</h4>
                  <div className="space-y-0.5">
                    {group.links.map((link) => {
                      const Icon = link.icon
                      const isActive = pathname === link.href
                      return (
                        <Link
                          key={link.name}
                          href={link.href}
                          className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-500'}`} />
                          {link.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={`px-4 pt-4 mt-4 ${!isProjectRoute ? 'border-t border-white/10' : ''}`}>
            <Link 
              href="/settings"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith('/settings') ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4 h-4" />
              Paramètres
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10 flex flex-col gap-3 bg-black/10">
          <a
            href="https://wa.me/2250707363020?text=Bonjour+TSBC%2C+j%27ai+besoin+d%27aide+sur+ProjetPilote"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15 rounded-xl text-xs font-semibold transition-colors border border-emerald-400/20"
          >
            <span>💬</span> Support TSBC
          </a>
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 font-bold uppercase text-orange-300">
                {userFullName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{userFullName}</p>
                <Link href="/settings" className="block truncate text-[10px] text-slate-400 transition-colors hover:text-orange-300">
                  Mon profil
                </Link>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-red-300"
              title="Déconnexion"
              aria-label="Déconnexion"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface border-t border-border flex items-center justify-around pb-safe z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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

          if (tab.disabled) {
            return (
              <div
                key={tab.name}
                className="flex flex-col items-center p-3 flex-1 transition-colors text-text-secondary/30 cursor-not-allowed"
                onClick={() => alert("Veuillez d'abord sélectionner un projet pour accéder à ce module.")}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{tab.name}</span>
              </div>
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
             {projectId ? (
               <div className="grid grid-cols-3 gap-4 p-4 max-h-[50vh] overflow-y-auto">
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
             ) : (
               <div className="p-8 text-center text-text-secondary flex flex-col items-center justify-center min-h-[30vh]">
                 <BriefcaseBusiness className="w-12 h-12 mb-4 opacity-20" />
                 <p className="text-sm font-medium">Veuillez d'abord sélectionner un projet pour voir plus de modules.</p>
               </div>
             )}
             
             {/* Mobile User Profile & Logout */}
             <div className="p-4 border-t border-border flex flex-col gap-3 bg-surface-dim">
                <a
                  href="https://wa.me/2250707363020?text=Bonjour+TSBC%2C+j%27ai+besoin+d%27aide+sur+ProjetPilote"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors border border-emerald-200"
                >
                  <span>💬</span> Support TSBC
                </a>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase shrink-0">
                      {userFullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-semibold text-text-primary truncate">{userFullName}</p>
                      <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className="text-xs text-text-secondary hover:text-primary transition-colors truncate block">Mon Profil</Link>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="p-2.5 text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </>
  )
}
