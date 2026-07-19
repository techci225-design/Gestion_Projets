'use client'

import React, { createContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: 'trial' | 'pro' | 'institutionnel'
  max_projects: number
  is_active: boolean
  created_at: string
  org_role?: 'owner' | 'admin' | 'member'
}

export interface OrganizationContextType {
  activeOrganization: Organization | null
  organizations: Organization[]
  setActiveOrganization: (org: Organization) => void
  isLoading: boolean
  isSuperAdmin: boolean
}

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [activeOrganization, setActiveOrganizationState] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadOrganizations() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      // Check for super admin status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single()
      
      const isSuperAdminStatus = profile?.is_super_admin === true
      setIsSuperAdmin(isSuperAdminStatus)

      const { data: orgMembers, error } = await supabase
        .from('organization_members')
        .select(`
          org_role,
          organizations (
            id,
            name,
            slug,
            logo_url,
            plan,
            max_projects,
            is_active,
            created_at
          )
        `)
        .eq('user_id', user.id)

      if (error || !orgMembers || orgMembers.length === 0) {
        // If super admin but no org members, they shouldn't be blocked entirely from the app if they only have the admin view, but typically they should have a demo org.
        if (!isSuperAdmin) {
          setIsLoading(false)
          return
        }
      }

      const orgs: Organization[] = (orgMembers || []).map((om: any) => ({
        ...om.organizations,
        org_role: om.org_role
      }))

      setOrganizations(orgs)

      // Handle Support Mode (Impersonation)
      const supportOrgId = Cookies.get('support_org_id')
      if (isSuperAdminStatus && supportOrgId) {
        // Fetch the impersonated organization directly
        const { data: supportOrg } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', supportOrgId)
          .single()

        if (supportOrg) {
          setActiveOrganizationState({ ...supportOrg, org_role: 'admin' } as Organization)
          setIsLoading(false)
          return
        }
      }

      const savedOrgId = Cookies.get('active_org_id')
      let activeOrg = orgs.find(o => o.id === savedOrgId)

      if (!activeOrg && orgs.length > 0) {
        activeOrg = orgs[0]
        Cookies.set('active_org_id', activeOrg.id, { expires: 365 })
      }

      setActiveOrganizationState(activeOrg || null)
      setIsLoading(false)
    }

    loadOrganizations()
  }, [supabase])

  const setActiveOrganization = (org: Organization) => {
    setActiveOrganizationState(org)
    Cookies.set('active_org_id', org.id, { expires: 365 })
    // If in support mode, maybe we shouldn't allow changing active organization via dropdown, or we clear support mode.
    // Let's clear support mode when changing org normally.
    Cookies.remove('support_org_id')
    router.refresh()
  }

  const exitSupportMode = () => {
    Cookies.remove('support_org_id')
    router.push('/admin/organizations')
    router.refresh()
  }

  return (
    <OrganizationContext.Provider value={{
      activeOrganization,
      organizations,
      setActiveOrganization,
      isLoading,
      isSuperAdmin
    }}>
      {Cookies.get('support_org_id') && activeOrganization && (
        <div className="bg-warning text-warning-foreground px-4 py-2 text-sm font-medium flex items-center justify-between sticky top-0 z-50">
          <span>Mode Support — Vous visualisez l'espace de <strong>{activeOrganization.name}</strong></span>
          <button onClick={exitSupportMode} className="underline hover:text-white transition-colors">Quitter le mode support</button>
        </div>
      )}
      {children}
    </OrganizationContext.Provider>
  )
}
