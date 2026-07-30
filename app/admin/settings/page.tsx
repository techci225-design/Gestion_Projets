import React from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSettingsClient } from './AdminSettingsClient'

export const dynamic = 'force-dynamic'

export default async function AdminPlatformSettingsPage() {
  const adminClient = createAdminClient()
  
  // Create default row if it doesn't exist
  let { data: settings } = await adminClient.from('platform_settings').select('*').eq('id', 1).single()
  
  if (!settings) {
    const { data: newSettings } = await adminClient.from('platform_settings').insert({
      id: 1,
      pro_price: 25000,
      inst_price: 100000,
      exchange_rate_eur: 655.957,
      exchange_rate_usd: 600
    }).select().single()
    settings = newSettings
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuration Plateforme</h1>
        <p className="text-gray-500 mt-1">Paramètres globaux, tarification et taux de change.</p>
      </div>
      <AdminSettingsClient initialSettings={settings} />
    </div>
  )
}
