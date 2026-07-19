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
}

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [activeOrganization, setActiveOrganizationState] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadOrganizations() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

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
        setIsLoading(false)
        return
      }

      const orgs: Organization[] = orgMembers.map((om: any) => ({
        ...om.organizations,
        org_role: om.org_role
      }))

      setOrganizations(orgs)

      const savedOrgId = Cookies.get('active_org_id')
      let activeOrg = orgs.find(o => o.id === savedOrgId)

      if (!activeOrg) {
        activeOrg = orgs[0]
        Cookies.set('active_org_id', activeOrg.id, { expires: 365 })
      }

      setActiveOrganizationState(activeOrg)
      setIsLoading(false)
    }

    loadOrganizations()
  }, [supabase])

  const setActiveOrganization = (org: Organization) => {
    setActiveOrganizationState(org)
    Cookies.set('active_org_id', org.id, { expires: 365 })
    router.refresh()
  }

  return (
    <OrganizationContext.Provider value={{ activeOrganization, organizations, setActiveOrganization, isLoading }}>
      {children}
    </OrganizationContext.Provider>
  )
}
