'use client'

import React, { useState } from 'react'
import { MoreVertical, Shield, Play, Pause, Edit, ArrowRight, Trash2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { updateOrganizationPlan, toggleOrganizationStatus, deleteOrganization } from '@/lib/actions/admin.actions'

export function OrganizationsClient({ orgs }: { orgs: any[] }) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Modals state
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'pro' | 'institutionnel'>('trial')
  const [maxProjects, setMaxProjects] = useState(3)
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  
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
    
    const res = await updateOrganizationPlan(selectedOrg.id, selectedPlan, maxProjects)
    setIsUpdating(false)
    setPlanModalOpen(false)
    
    if (res?.success) {
      alert(`Plan mis à jour pour ${selectedOrg.name}`)
    } else if (res?.error) {
      alert(res.error)
    }
  }

  const openPlanModal = (org: any) => {
    setSelectedOrg(org)
    setSelectedPlan(org.plan)
    setMaxProjects(org.max_projects)
    setPlanModalOpen(true)
  }

  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPlan = e.target.value as 'trial' | 'pro' | 'institutionnel'
    setSelectedPlan(newPlan)
    if (newPlan === 'trial') setMaxProjects(3)
    if (newPlan === 'pro') setMaxProjects(99)
    if (newPlan === 'institutionnel') setMaxProjects(999)
  }

  const confirmDelete = (org: any) => {
    setSelectedOrg(org)
    setDeleteError('')
    setDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedOrg) return
    setIsUpdating(true)
    setDeleteError('')
    
    const res = await deleteOrganization(selectedOrg.id)
    if (res?.error) {
      setDeleteError(res.error)
    } else {
      setDeleteModalOpen(false)
    }
    setIsUpdating(false)
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
                          onClick={() => openPlanModal(org)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4 text-gray-400" /> Changer le plan
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(org.id, org.is_active)}
                          disabled={isUpdating}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                        >
                          {org.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          {org.is_active ? 'Suspendre' : 'Réactiver'}
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button 
                          onClick={() => confirmDelete(org)}
                          disabled={isUpdating}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-danger/5 flex items-center gap-2 text-danger"
                        >
                          <Trash2 className="w-4 h-4" /> Supprimer
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && selectedOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-danger" />
              </div>
              <h3 className="font-bold text-gray-900">Supprimer l'organisation</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600 text-sm">
                Êtes-vous sûr de vouloir supprimer l'organisation <span className="font-bold">{selectedOrg.name}</span> ? Cette action est irréversible.
              </p>
              
              {deleteError && (
                <div className="p-3 bg-danger/10 text-danger text-sm rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{deleteError}</p>
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  onClick={handleDelete}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg hover:bg-danger/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdating ? 'Suppression...' : 'Oui, supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <select 
                  name="plan" 
                  value={selectedPlan}
                  onChange={handlePlanChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="trial">Trial</option>
                  <option value="pro">Pro</option>
                  <option value="institutionnel">Institutionnel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Projets</label>
                <input 
                  type="number" 
                  name="max_projects" 
                  value={maxProjects}
                  onChange={e => setMaxProjects(parseInt(e.target.value) || 0)}
                  required 
                  min={1} 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                />
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
