import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'
import { UserCircle } from 'lucide-react'

export default async function MembresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: membres, error } = await supabase
    .from('project_members')
    .select(`
      *,
      profiles(full_name, email)
    `)
    .eq('project_id', id)

  if (error) {
    return (
      <div className="p-6">
        <Header title="Membres du projet" />
        <div className="mt-6 text-danger">Erreur de chargement: {error.message}</div>
      </div>
    )
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-white">Propriétaire</span>
      case 'chef_projet':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Chef de projet</span>
      case 'comptable':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">Comptable</span>
      case 'consultant':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Consultant</span>
      case 'bailleur_lecture':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Bailleur (lecture seule)</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{role}</span>
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Membres de l'équipe" />
      
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border text-[13px] font-semibold text-text-primary uppercase tracking-wider">
                  <th className="p-4 w-12"></th>
                  <th className="p-4 w-64">Nom Complet</th>
                  <th className="p-4 w-64">Email</th>
                  <th className="p-4">Rôle</th>
                  <th className="p-4 text-right">Ajouté le</th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                {membres && membres.length > 0 ? (
                  membres.map((membre) => {
                    const profile = membre.profiles as any
                    return (
                      <tr key={membre.id || membre.user_id} className="border-b border-border hover:bg-surface-dim/50 transition-colors">
                        <td className="p-4 text-text-secondary">
                          <UserCircle className="w-8 h-8 opacity-50" />
                        </td>
                        <td className="p-4 font-medium text-text-primary">
                          {profile?.full_name || 'Utilisateur inconnu'}
                        </td>
                        <td className="p-4 text-text-secondary">
                          {profile?.email || '—'}
                        </td>
                        <td className="p-4">
                          {getRoleBadge(membre.role)}
                        </td>
                        <td className="p-4 text-right text-text-secondary text-sm">
                          {membre.added_at ? new Date(membre.added_at).toLocaleDateString('fr-FR') : '—'}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text-secondary">
                      Aucun membre assigné.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
