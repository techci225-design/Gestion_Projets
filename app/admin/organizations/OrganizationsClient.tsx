'use client'

import React, { useState } from 'react'
import { MoreVertical, Shield, Play, Pause, Edit, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { updateOrganizationPlan, toggleOrganizationStatus } from '@/lib/actions/admin.actions'

export function OrganizationsClient({ orgs }: { orgs: any[] }) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Modals state
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  
  const handleSupportMode = (orgId: string) => {
    Cookies.set('support_org_id', orgId, { expires: 1 }) // 1 day
    router.push('/projects')
  }

  const handleToggleStatus = async (orgId: string, currentStatus: boolean) => {
    setIsUpdating(true)
    await toggleOrganizationStatus(orgId, !currentStatus)
    setIsUpdating(false)
  }

  const handlePlanSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedOrg) return
    setIsUpdating(true)
    const formData = new FormData(e.currentTarget)
    const plan = formData.get('plan') as 'trial' | 'pro' | 'institutionnel'
    const maxProjects = parseInt(formData.get('max_projects') as string)
    
    await updateOrganizationPlan(selectedOrg.id, plan, maxProjects)
    setIsUpdating(false)
    setPlanModalOpen(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-900 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Organisation</th>
              <th className="px-6 py-4 font-semibold">Plan</th>
              <th className="px-6 py-4 font-semibold">Projets</th>
              <th className="px-6 py-4 font-semibold">Membres</th>
              <th className="px-6 py-4 font-semibold">Statut</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orgs.map(org => (
              <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{org.name}</div>
                  <div className="text-xs text-gray-400">{org.slug}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    org.plan === 'trial' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    org.plan === 'pro' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    {org.plan.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {org.projects?.[0]?.count || 0} / {org.max_projects}
                </td>
                <td className="px-6 py-4">
                  {org.organization_members?.[0]?.count || 0}
                </td>
                <td className="px-6 py-4">
                  {org.is_active ? (
                    <span className="flex items-center gap-1.5 text-success">
                      <div className="w-2 h-2 rounded-full bg-success"></div> Actif
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-danger">
                      <div className="w-2 h-2 rounded-full bg-danger"></div> Suspendu
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleSupportMode(org.id)}
                      className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Voir comme ce client"
                    >
                      <Shield className="w-3.5 h-3.5" /> Support
                    </button>
                    
                    <div className="relative group">
                      <button className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 py-1">
                        <button 
                          onClick={() => { setSelectedOrg(org); setPlanModalOpen(true); }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4 text-gray-400" /> Changer le plan
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(org.id, org.is_active)}
                          disabled={isUpdating}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-danger"
                        >
                          {org.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          {org.is_active ? 'Suspendre' : 'Réactiver'}
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Plan Update Modal */}
      {planModalOpen && selectedOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Changer le plan de {selectedOrg.name}</h3>
              <button onClick={() => setPlanModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handlePlanSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau Plan</label>
                <select name="plan" defaultValue={selectedOrg.plan} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="trial">Trial</option>
                  <option value="pro">Pro</option>
                  <option value="institutionnel">Institutionnel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Projets</label>
                <input type="number" name="max_projects" defaultValue={selectedOrg.max_projects} required min={1} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setPlanModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={isUpdating} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {isUpdating ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
