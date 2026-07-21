'use client'

import { useState } from 'react'
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { removeMember, updateMemberRole } from '@/lib/actions/members.actions'
import { cancelInvitation, sendInvitation } from '@/lib/actions/invitations.actions'

export function MembresClient({ projectId, organizationId, members, pendingInvitations }: { projectId: string, organizationId: string, members: any[], pendingInvitations: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleRemove = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce membre du projet ?')) return
    setIsUpdating(true)
    const res = await removeMember(projectId, userId)
    setIsUpdating(false)
    setActiveDropdown(null)
    if (res?.error) alert(res.error)
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setIsUpdating(true)
    const res = await updateMemberRole(projectId, userId, newRole)
    setIsUpdating(false)
    setActiveDropdown(null)
    if (res?.error) alert(res.error)
  }

  const handleCancelInvitation = async (invId: string) => {
    if (!confirm('Voulez-vous vraiment annuler cette invitation ?')) return
    setIsUpdating(true)
    const res = await cancelInvitation(invId)
    setIsUpdating(false)
    if (res?.error) alert(res.error)
  }

  const handleResendInvitation = async (invitation: any) => {
    setIsUpdating(true)
    const res = await sendInvitation({
      project_id: projectId,
      organization_id: organizationId,
      email: invitation.invited_email,
      role: invitation.invited_role
    })
    setIsUpdating(false)
    if (res?.error) alert(res.error)
    else alert('Invitation renvoyée avec succès !')
  }

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
                    <td className="p-4 text-right relative">
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === m.id ? null : m.id)}
                        disabled={isUpdating}
                        className="p-2 text-text-secondary hover:bg-surface-dim rounded-full transition-colors disabled:opacity-50"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {activeDropdown === m.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveDropdown(null)}
                          />
                          <div className="absolute right-8 top-12 w-48 bg-white rounded-lg shadow-lg border border-border py-1 z-20 text-left">
                            <div className="px-4 py-2 text-xs font-semibold text-text-secondary uppercase">Changer le rôle</div>
                            <button onClick={() => handleRoleChange(m.user_id, 'owner')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-dim">Propriétaire</button>
                            <button onClick={() => handleRoleChange(m.user_id, 'chef_projet')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-dim">Chef de Projet</button>
                            <button onClick={() => handleRoleChange(m.user_id, 'comptable')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-dim">Comptable</button>
                            <button onClick={() => handleRoleChange(m.user_id, 'consultant')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-dim">Consultant</button>
                            <button onClick={() => handleRoleChange(m.user_id, 'bailleur_lecture')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-dim">Bailleur (Lecture)</button>
                            
                            <div className="h-px bg-border my-1" />
                            
                            <button 
                              onClick={() => handleRemove(m.user_id)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Retirer du projet
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-text-secondary border-b border-border">
                    Aucun membre dans ce projet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingInvitations && pendingInvitations.length > 0 && (
        <div className="mt-8 bg-surface-container-lowest rounded-xl shadow-sm border border-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border bg-surface-dim">
            <h2 className="text-lg font-semibold text-text-primary">Invitations en attente</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-dim border-b border-border">
                  <th className="p-4 text-xs font-semibold text-text-secondary">Email invité</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary">Rôle</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary">Invité par</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary">Date d'envoi</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary">Expire le</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pendingInvitations.map((inv, index) => (
                  <tr key={inv.id} className={`border-b border-border hover:bg-surface-bright transition-colors ${index % 2 !== 0 ? 'bg-surface-dim/30' : ''}`}>
                    <td className="p-4">
                      <div className="font-medium text-text-primary">{inv.invited_email}</div>
                    </td>
                    <td className="p-4">
                      {getRoleBadge(inv.invited_role)}
                    </td>
                    <td className="p-4 text-text-secondary">
                      {inv.invited_by_profile?.full_name || 'Inconnu'}
                    </td>
                    <td className="p-4 text-text-secondary">
                      {new Date(inv.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-4 text-warning-dark">
                      {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          disabled={isUpdating}
                          onClick={() => handleResendInvitation(inv)}
                          className="text-xs text-primary hover:underline px-2 py-1 disabled:opacity-50"
                        >
                          Renvoyer
                        </button>
                        <button 
                          disabled={isUpdating}
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="text-xs text-danger hover:underline px-2 py-1 disabled:opacity-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InviteMemberModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        projectId={projectId}
        organizationId={organizationId}
      />
    </div>
  )
}
