'use client'

import React from 'react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts'
import { AlertTriangle, TrendingUp, Activity } from 'lucide-react'

export function StatsClient({ kpis, churnRisk, graphData, moduleUsage }: { kpis: any, churnRisk: any[], graphData: any[], moduleUsage: any[] }) {
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-lg">
          <p className="font-bold text-gray-900 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Section C : Inscriptions (Graphique Ligne) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> 
            Évolution des inscriptions (12 dernières semaines)
          </h2>
        </div>
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line type="monotone" dataKey="total" name="Total Inscriptions" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="pro" name="Abonnements PRO" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section B : Clients en danger (Churn Risk) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50/50 rounded-t-xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" /> 
            Clients en danger (Risque de Churn)
          </h2>
        </div>
        <div className="p-4 bg-red-50/30 text-sm text-red-700 border-b border-red-100">
          Ces organisations n'ont eu aucune activité au cours des 7 derniers jours.
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-gray-900 sticky top-0 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-tl-lg">Organisation</th>
                <th className="px-4 py-3 font-semibold text-center">Plan</th>
                <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">Dernière connexion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {churnRisk.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">Aucun client en danger. Bravo !</td>
                </tr>
              ) : churnRisk.map((org: any) => (
                <tr key={org.id} className="hover:bg-red-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[200px]">{org.name}</div>
                    <div className="text-xs text-gray-400">{org.nb_projects} projet(s)</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                      org.plan === 'trial' ? 'bg-orange-50 text-orange-700' :
                      org.plan === 'pro' ? 'bg-blue-50 text-blue-700' :
                      'bg-green-50 text-green-700'
                    }`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600 whitespace-nowrap text-xs">
                    {org.last_seen_at ? new Date(org.last_seen_at).toLocaleDateString('fr-FR') : 'Jamais'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section D : Utilisation des modules */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> 
            Adoption des Modules
          </h2>
        </div>
        <div className="flex-1 p-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={moduleUsage}
              margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Bar dataKey="count" name="Enregistrements" radius={[0, 4, 4, 0]} barSize={24}>
                {moduleUsage.map((entry, index) => {
                  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6']
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
