'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'

export interface Organization {
  id: string
  name: string
  created_at: string
  role?: string // from organization_members
}

interface OrganizationContextType {
  activeOrganization: Organization | null
  organizations: Organization[]
  setActiveOrganization: (org: Organization) => void
  isLoading: boolean
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

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

      // Fetch organizations the user belongs to
      const { data: orgMembers, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organizations (
            id,
            name,
            created_at
          )
        `)
        .eq('user_id', user.id)

      if (error || !orgMembers || orgMembers.length === 0) {
        setIsLoading(false)
        return
      }

      const orgs: Organization[] = orgMembers.map((om: any) => ({
        id: om.organizations.id,
        name: om.organizations.name,
        created_at: om.organizations.created_at,
        role: om.role
      }))

      setOrganizations(orgs)

      // Determine active organization
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
    router.refresh() // Refresh to re-fetch server components with new active_org_id
  }

  return (
    <OrganizationContext.Provider value={{ activeOrganization, organizations, setActiveOrganization, isLoading }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
