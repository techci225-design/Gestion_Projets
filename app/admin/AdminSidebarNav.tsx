'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Users, BarChart3 } from 'lucide-react'

export function AdminSidebarNav() {
  const pathname = usePathname()

  const links = [
    { name: 'Organisations', href: '/admin/organizations', icon: Building2 },
    { name: 'Utilisateurs', href: '/admin/users', icon: Users },
    { name: 'Statistiques', href: '/admin/statistics', icon: BarChart3 },
  ]

  return (
    <nav className="space-y-1">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href)
        const Icon = link.icon

        return (
          <Link
            key={link.name}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5" />
            {link.name}
          </Link>
        )
      })}
    </nav>
  )
}
