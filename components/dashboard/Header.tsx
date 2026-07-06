'use client'

import React from 'react'
import { Bell, Search, Menu } from 'lucide-react'
import { NotificationBell } from './NotificationBell'

interface HeaderProps {
  title: string
  userFullName?: string
}

export function Header({ title, userFullName }: HeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-surface border-b border-border sticky top-0 z-10">
      <h1 className="text-xl font-semibold text-text-primary tracking-tight">{title}</h1>
      <div className="flex items-center gap-3 md:gap-4">
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
