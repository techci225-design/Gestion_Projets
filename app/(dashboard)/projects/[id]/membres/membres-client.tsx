'use client'

import { useState } from 'react'
import { Plus, MoreVertical } from 'lucide-react'
import { InviteMemberModal } from './invite-member-modal'

export function MembresClient({ projectId, members, allProfiles }: { projectId: string, members: any[], allProfiles: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'owner':
        return <span className="bg-blue-900 text-blue-100 text-xs px-2 py-1 rounded">Propriétaire</span>
      case 'chef_projet':
        return <span className="bg-primary text-white text-xs px-2 py-1 rounded">Chef de Projet</span>
      case 'comptable':
        return <span className="bg-secondary text-white text-xs px-2 py-1 rounded">Comptable</span>
      case 'bailleur_lecture':
        return <span className="bg-surface-variant text-primary text-xs px-2 py-1 rounded">Bailleur (Lecture)</span>
      case 'consultant':
        return <span className="bg-tertiary-fixed text-on-tertiary-container text-xs px-2 py-1 rounded">Consultant</span>
      default:
        return <span className="bg-surface-dim text-primary text-xs px-2 py-1 rounded">{role}</span>
    }
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.substring(0,2).toUpperCase()
    if (email) return email.substring(0,2).toUpperCase()
    return '??'
  }

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Équipe du Projet</h1>
          <p className="text-text-secondary">Gérez les accès et les rôles des collaborateurs sur ce projet.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white text-sm px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Inviter un membre
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-dim border-b border-border">
                <th className="p-4 text-xs font-semibold text-text-secondary">Utilisateur</th>
                <th className="p-4 text-xs font-semibold text-text-secondary">Rôle</th>
                <th className="p-4 text-xs font-semibold text-text-secondary">Date d'ajout</th>
                <th className="p-4 text-xs font-semibold text-text-secondary text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {members.map((m, index) => {
                const profile = m.profiles
                return (
                  <tr key={m.id} className={`border-b border-border hover:bg-surface-bright transition-colors ${index % 2 !== 0 ? 'bg-surface-dim/30' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
                          {getInitials(profile?.full_name, profile?.email)}
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">{profile?.full_name || 'Utilisateur inconnu'}</div>
                          <div className="text-xs text-text-secondary">{profile?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {getRoleBadge(m.role)}
                    </td>
                    <td className="p-4 text-text-secondary">
                      {m.added_at ? new Date(m.added_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 text-text-secondary hover:bg-surface-dim rounded-full transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-text-secondary">Aucun membre enregistré</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InviteMemberModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} projectId={projectId} allProfiles={allProfiles} />
    </div>
  )
}
