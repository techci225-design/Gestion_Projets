'use client'

import { useContext } from 'react'
import { OrganizationContext, OrganizationContextType } from '@/lib/contexts/OrganizationContext'

export function useOrganization(): OrganizationContextType {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
