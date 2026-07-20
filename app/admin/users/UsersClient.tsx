'use client'

import React, { useState, useMemo } from 'react'
import { Search, MoreVertical, Key, ExternalLink } from 'lucide-react'
import { generatePasswordResetLink } from '@/lib/actions/admin.actions'
import { useRouter } from 'next/navigation'

export function UsersClient({ users }: { users: any[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [orgFilter, setOrgFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(false)

  // Extract unique organizations for filter
  const organizations = useMemo(() => {
    const orgs = new Set<string>()
    users.forEach(u => {
      if (u.organization_name) orgs.add(u.organization_name)
    })
    return Array.from(orgs).sort()
  }, [users])

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchSearch = 
        (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchOrg = orgFilter === 'ALL' || user.organization_name === orgFilter

      return matchSearch && matchOrg
    })
  }, [users, searchTerm, orgFilter])

  const handleResetPassword = async (email: string) => {
    setIsLoading(true)
    const res = await generatePasswordResetLink(email)
    setIsLoading(false)
    
    if (res?.error) {
      alert(res.error)
    } else if (res?.link) {
      navigator.clipboard.writeText(res.link)
      alert('Lien de réinitialisation copié dans le presse-papier !')
    }
  }

  const handleViewProjects = (orgId: string) => {
    if (orgId) {
      document.cookie = `support_org_id=${orgId}; path=/; max-age=86400`
      router.push('/projects')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-w-0">
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou email..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
        
        <select 
          value={orgFilter}
          onChange={e => setOrgFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
        >
          <option value="ALL">Toutes les organisations</option>
          {organizations.map(org => (
            <option key={org} value={org}>{org}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-900 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 font-semibold w-12"></th>
              <th className="px-3 py-3 font-semibold">Utilisateur</th>
              <th className="px-3 py-3 font-semibold">Organisation</th>
              <th className="px-3 py-3 font-semibold">Rôle</th>
              <th className="px-3 py-3 font-semibold text-center">Projets</th>
              <th className="px-3 py-3 font-semibold">Inscrit le</th>
              <th className="px-3 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : filteredUsers.map(user => {
              const initials = (user.full_name || user.email || '?').charAt(0).toUpperCase()
              
              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      {initials}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[150px]">{user.full_name || 'Sans nom'}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[150px]">{user.email}</div>
                  </td>
                  <td className="px-3 py-3">
                    {user.organization_name ? (
                      <div>
                        <div className="font-medium text-gray-900 truncate max-w-[120px]">{user.organization_name}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                          user.organization_plan === 'trial' ? 'bg-orange-50 text-orange-700' :
                          user.organization_plan === 'pro' ? 'bg-blue-50 text-blue-700' :
                          'bg-purple-50 text-purple-700'
                        }`}>
                          {user.organization_plan}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Aucune</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {user.org_role ? (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap border ${
                        user.org_role === 'owner' ? 'bg-green-50 text-green-700 border-green-200' :
                        user.org_role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {user.org_role}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-gray-900">
                    {user.nb_projects || 0}
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 relative group">
                      <button className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 py-1">
                        {user.organization_id && (
                          <button 
                            onClick={() => handleViewProjects(user.organization_id)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-400" /> Voir ses projets
                          </button>
                        )}
                        <button 
                          onClick={() => handleResetPassword(user.email)}
                          disabled={isLoading}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 disabled:opacity-50"
                        >
                          <Key className="w-4 h-4 text-gray-400" /> Réinit. mot de passe
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
