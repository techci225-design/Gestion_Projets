import React from 'react'
import { getAdminStatistics } from '@/lib/actions/admin.actions'
import { StatsClient } from './StatsClient'
import { Building2, Power, TrendingUp, Users, Wallet, CreditCard } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminStatsPage() {
  const stats = await getAdminStatistics()
  const { kpis, churnRisk, graphData, moduleUsage } = stats
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Commercial TSBC</h1>
        <p className="text-gray-500 mt-1">Analyse de l'adoption, de l'engagement et des revenus de la plateforme.</p>
      </div>

      {/* Section A : Métriques d'adoption */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Power className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taux d'Activation</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">{kpis.activationRate}%</p>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">({kpis.totalOrgs} organisations au total)</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-emerald-300 transition-colors">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taux d'Engagement</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">{kpis.engagementRate}%</p>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">({kpis.activeOrgs} organisations actives)</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-orange-300 transition-colors">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conversion PRO</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">{kpis.conversionRate}%</p>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">({kpis.proOrgs} abonnements PRO)</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-purple-300 transition-colors">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">MRR Estimé</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">{kpis.mrr.toLocaleString('fr-FR')}</p>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">FCFA / mois</p>
          </div>
        </div>
      </div>

      <StatsClient kpis={kpis} churnRisk={churnRisk} graphData={graphData} moduleUsage={moduleUsage} />
    </div>
  )
}

