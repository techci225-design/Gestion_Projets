'use client'

import React, { useTransition } from 'react'
import { seedDemoProject } from '@/lib/actions/seed.actions'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'

export function DemoProjectButton({ organizationId }: { organizationId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSeed = () => {
    startTransition(async () => {
      const result = await seedDemoProject(organizationId)
      if (result?.error) {
        alert(result.error)
      } else if (result?.success) {
        // Here we could use a proper toast if available, otherwise just redirect
        router.push(`/projects/${result.projectId}`)
      }
    })
  }

  return (
    <button
      onClick={handleSeed}
      disabled={isPending}
      className="text-sm font-medium text-text-tertiary hover:text-primary transition-colors inline-flex justify-center items-center gap-1 mt-2 disabled:opacity-50"
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      ou charger un projet de démonstration <ArrowRight className="w-4 h-4" />
    </button>
  )
}
