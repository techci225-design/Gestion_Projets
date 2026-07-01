'use client'

import React from 'react'
import { Bell } from 'lucide-react'

interface HeaderProps {
  title: string
  userFullName?: string
}

export function Header({ title, userFullName }: HeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-surface border-b border-border sticky top-0 z-10">
      <h1 className="text-xl font-semibold text-text-primary tracking-tight">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-text-secondary hover:text-primary transition-colors rounded-full hover:bg-surface-dim">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border border-surface"></span>
        </button>
        {userFullName && (
          <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold uppercase">
            {userFullName.charAt(0)}
          </div>
        )}
      </div>
    </header>
  )
}
