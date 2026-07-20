import React from 'react'
import { getAdminStatistics } from '@/lib/actions/admin.actions'
import { StatsClient } from './StatsClient'
import { Building2, FolderTree, Wallet, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminStatsPage() {
  const stats = await getAdminStatistics()
  const { kpis, recentActivity, topOrgs } = stats
  
  const conversionRate = kpis.totalOrgs > 0 
    ? Math.round((kpis.proOrgs / kpis.totalOrgs) * 100) 
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistiques de la Plateforme</h1>
        <p className="text-gray-500 mt-1">Vue globale de l'activité multi-tenant.</p>
      </div>

      {/* Bloc 1 : KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Organisations</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.activeOrgs} <span className="text-sm font-medium text-gray-400">/ {kpis.totalOrgs}</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Projets Actifs</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.activeProjects}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Budget Géré</p>
            <p className="text-xl font-bold text-gray-900">{kpis.totalBudget.toLocaleString('fr-FR')} <span className="text-sm font-medium text-gray-400">FCFA</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conversion PRO</p>
            <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
          </div>
        </div>
      </div>

      <StatsClient kpis={kpis} recentActivity={recentActivity} topOrgs={topOrgs} />
    </div>
  )
}
