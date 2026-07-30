'use client'

import React, { useState } from 'react'
import { Settings, CreditCard, DollarSign, CheckCircle2, AlertTriangle, Save } from 'lucide-react'
import { updatePlatformSettings } from '@/lib/actions/admin.actions'

export function AdminSettingsClient({ initialSettings }: { initialSettings: any }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [settings, setSettings] = useState({
    pro_price: initialSettings.pro_price || 25000,
    inst_price: initialSettings.inst_price || 100000,
    exchange_rate_eur: initialSettings.exchange_rate_eur || 655.957,
    exchange_rate_usd: initialSettings.exchange_rate_usd || 600
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSettings(prev => ({ ...prev, [name]: parseFloat(value) || 0 }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError(null)

    const res = await updatePlatformSettings(settings)
    if (res.error) {
      setError(res.error)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Tarification */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-gray-900">Tarification (FCFA / mois)</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan PRO</label>
              <input 
                type="number" 
                name="pro_price"
                value={settings.pro_price}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
              />
              <p className="text-xs text-gray-500 mt-1">Utilisé pour calculer le MRR.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Institutionnel</label>
              <input 
                type="number" 
                name="inst_price"
                value={settings.inst_price}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Taux de Change */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-gray-900">Taux de Change (Base FCFA)</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Euro (1 EUR = ? FCFA)</label>
              <input 
                type="number" 
                step="0.001"
                name="exchange_rate_eur"
                value={settings.exchange_rate_eur}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dollar (1 USD = ? FCFA)</label>
              <input 
                type="number" 
                step="0.01"
                name="exchange_rate_usd"
                value={settings.exchange_rate_usd}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button & Actions */}
      <div className="lg:col-span-2">
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </button>
          {success && (
            <span className="text-emerald-600 text-sm font-medium flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> Modifications enregistrées
            </span>
          )}
        </div>
      </div>
      
    </div>
  )
}
