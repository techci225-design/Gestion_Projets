'use client'

import React, { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'
import { updateEvmDate } from '@/lib/actions/evm.actions'

interface EvmDateSelectorProps {
  projectId: string
  currentDate: string
}

export function EvmDateSelector({ projectId, currentDate }: EvmDateSelectorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    if (!newDate) return

    startTransition(async () => {
      await updateEvmDate(projectId, newDate)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3 bg-surface p-2 px-4 rounded-md shadow-sm border border-border">
      <Calendar className="w-4 h-4 text-text-secondary" />
      <span className="text-sm font-medium text-text-secondary">Arrêté au :</span>
      <input
        type="date"
        defaultValue={currentDate}
        onChange={handleDateChange}
        disabled={isPending}
        className="text-sm font-semibold bg-transparent border-none focus:ring-0 text-primary cursor-pointer disabled:opacity-50"
      />
    </div>
  )
}
