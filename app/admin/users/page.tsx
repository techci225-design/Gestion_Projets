import React from 'react'
import { getAdminUsers } from '@/lib/actions/admin.actions'
import { UsersClient } from './UsersClient'
import { Users, UserPlus, Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const users = await getAdminUsers()

  const totalUsers = users.length
  
  // Inscrits ce mois
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const newThisMonth = users.filter(u => new Date(u.created_at) >= startOfMonth).length

  // Avec organisation
  const withOrg = users.filter(u => u.organization_name != null).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <p className="text-gray-500 mt-1">Gérez tous les utilisateurs de la plateforme TSBC.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total utilisateurs</p>
            <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-success/10 text-success rounded-xl flex items-center justify-center">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Inscrits ce mois</p>
            <p className="text-2xl font-bold text-gray-900">{newThisMonth}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avec organisation</p>
            <p className="text-2xl font-bold text-gray-900">{withOrg}</p>
          </div>
        </div>
      </div>

      <UsersClient users={users} />
    </div>
  )
}
