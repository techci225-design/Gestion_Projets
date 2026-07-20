'use client'

import React from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts'
import { Activity, Award } from 'lucide-react'

export function StatsClient({ kpis, recentActivity, topOrgs }: { kpis: any, recentActivity: any[], topOrgs: any[] }) {
  
  // Data for chart
  const planData = [
    { name: 'Trial', count: kpis.trialOrgs, color: '#f97316' }, // orange-500
    { name: 'Pro', count: kpis.proOrgs, color: '#1e3a8a' }, // blue-900 (marine)
    { name: 'Institutionnel', count: kpis.instOrgs, color: '#16a34a' } // green-600
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{payload[0].payload.name}</p>
          <p className="text-gray-600">{payload[0].value} organisation(s)</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Bloc 2 : Graphique Répartition */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Répartition par Plan</h2>
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={planData}
              margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fill: '#475569', fontSize: 13, fontWeight: 500 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                {planData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bloc 3 : Top 5 Organisations */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm lg:col-span-2 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" /> Top 5 Organisations Actives
          </h2>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-600 h-full">
            <thead className="bg-gray-50 text-gray-900 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold w-16 text-center">Rang</th>
                <th className="px-6 py-4 font-semibold">Organisation</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold text-center">Projets</th>
                <th className="px-6 py-4 font-semibold text-center">Membres</th>
                <th className="px-6 py-4 font-semibold text-right">Budget (FCFA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topOrgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Aucune donnée</td>
                </tr>
              ) : topOrgs.map((org, idx) => (
                <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-center font-bold text-gray-400">#{idx + 1}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{org.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      org.plan === 'trial' ? 'bg-orange-50 text-orange-700' :
                      org.plan === 'pro' ? 'bg-blue-50 text-blue-700' :
                      'bg-green-50 text-green-700'
                    }`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-gray-900">{org.nb_projets}</td>
                  <td className="px-6 py-4 text-center text-gray-600">{org.nb_membres}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {org.budget_total.toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bloc 4 : Activité Récente */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm lg:col-span-3 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Activité Récente (10 dernières actions)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Date/Heure</th>
                <th className="px-6 py-4 font-semibold">Utilisateur</th>
                <th className="px-6 py-4 font-semibold">Module</th>
                <th className="px-6 py-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Aucune activité récente</td>
                </tr>
              ) : recentActivity.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{log.profiles?.full_name || 'Inconnu'}</div>
                    <div className="text-xs text-gray-400">{log.profiles?.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium uppercase">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">{log.action}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
