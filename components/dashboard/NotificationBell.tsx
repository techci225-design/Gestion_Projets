'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bell, Check, Info, AlertTriangle, ShieldAlert, CircleDollarSign } from 'lucide-react'
import { getUnreadNotifications, markNotificationAsRead, markAllAsRead } from '@/lib/actions/notifications.actions'
import Link from 'next/link'

type Notification = {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  created_at: string
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()

    // Clic en dehors du dropdown pour fermer
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    const res = await getUnreadNotifications()
    if (res.data) {
      setNotifications(res.data)
      setUnreadCount(res.data.length)
    }
  }

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const res = await markNotificationAsRead(id)
    if (res.success) {
      setNotifications(prev => prev.filter(n => n.id !== id))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleMarkAllAsRead = async () => {
    const res = await markAllAsRead()
    if (res.success) {
      setNotifications([])
      setUnreadCount(0)
      setIsOpen(false)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'budget_seuil_80':
      case 'budget_seuil_100':
        return <CircleDollarSign className="w-5 h-5 text-warning" />
      case 'marche_echeance_proche':
      case 'marche_echeance_depassee':
        return <Info className="w-5 h-5 text-primary" />
      case 'risque_critique':
        return <ShieldAlert className="w-5 h-5 text-danger" />
      case 'cpi_alerte':
      case 'spi_alerte':
        return <AlertTriangle className="w-5 h-5 text-warning" />
      default:
        return <Info className="w-5 h-5 text-text-secondary" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-text-secondary hover:text-text-primary rounded-full hover:bg-surface-container transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full border-2 border-surface"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface-dim">
            <h3 className="font-semibold text-text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Tout lire
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-text-secondary text-sm">
                Aucune nouvelle notification.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notif) => (
                  <li key={notif.id} className="relative group">
                    {notif.link ? (
                      <Link href={notif.link} className="block p-4 hover:bg-surface-container/50 transition-colors">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">{getIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary">{notif.title}</p>
                            <p className="text-xs text-text-secondary mt-1 line-clamp-2">{notif.body}</p>
                            <p className="text-[10px] text-text-tertiary mt-2">
                              {new Date(notif.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="block p-4 hover:bg-surface-container/50 transition-colors">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">{getIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary">{notif.title}</p>
                            <p className="text-xs text-text-secondary mt-1 line-clamp-2">{notif.body}</p>
                            <p className="text-[10px] text-text-tertiary mt-2">
                              {new Date(notif.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="absolute top-2 right-2 p-1.5 rounded-full text-text-tertiary hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                      title="Marquer comme lu"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
