'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bell, Check, X, AlertTriangle, AlertCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getUnreadNotifications, markNotificationAsRead, markAllAsRead } from '@/lib/actions/notifications.actions'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  is_read: boolean
  created_at: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()
  const router = useRouter()
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initial fetch
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data && !error) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    }

    fetchNotifications()

    // Realtime subscription
    let channel: any
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel('notifications_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification
            setNotifications(prev => [newNotif, ...prev].slice(0, 20))
            setUnreadCount(prev => prev + 1)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updatedNotif = payload.new as Notification
            setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n))
            if (updatedNotif.is_read && !payload.old.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          }
        )
        .subscribe()
    }
    
    setupRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase])

  // Close drawer on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAsRead = async (id: string, link: string | null) => {
    if (!notifications.find(n => n.id === id)?.is_read) {
      await markNotificationAsRead(id)
      setUnreadCount(prev => Math.max(0, prev - 1))
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    }
    setIsOpen(false)
    if (link) {
      router.push(link)
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const getIcon = (type: string) => {
    switch(type) {
      case 'budget_seuil_100':
      case 'marche_echeance_depassee':
      case 'risque_critique':
      case 'cpi_alerte':
        return <AlertCircle className="w-5 h-5 text-danger" />
      case 'budget_seuil_80':
      case 'marche_echeance_proche':
      case 'spi_alerte':
        return <AlertTriangle className="w-5 h-5 text-warning" />
      default:
        return <Bell className="w-5 h-5 text-primary" />
    }
  }

  return (
    <div className="relative z-[100]">
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-text-secondary hover:text-primary rounded-lg hover:bg-surface-hover transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-danger text-white text-[9px] font-bold rounded-full border-2 border-surface flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" />
      )}

      {/* Drawer */}
      <div 
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-80 bg-surface shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-bright">
          <h2 className="text-lg font-semibold text-text-primary">Notifications</h2>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-surface-hover rounded text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-text-secondary mt-10">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => handleMarkAsRead(notif.id, notif.link)}
                  className={`p-4 border-b border-border cursor-pointer hover:bg-surface-hover transition-colors flex gap-3 ${notif.is_read ? 'opacity-60' : 'bg-primary/5'}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-text-primary mb-1">{notif.title}</h4>
                    <p className="text-xs text-text-secondary mb-2 leading-relaxed">{notif.body}</p>
                    <div className="flex items-center text-[10px] text-text-tertiary">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}
                    </div>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {unreadCount > 0 && (
          <div className="p-4 border-t border-border bg-surface-bright">
            <button 
              onClick={handleMarkAllAsRead}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Tout marquer comme lu
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
