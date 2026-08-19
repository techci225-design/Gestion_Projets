import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { supabase } from '../../lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import { formatCurrency } from '../../lib/utils'

export function ProjectDetailScreen() {
  const route = useRoute<any>()
  const { projectId } = route.params
  const navigation = useNavigation<any>()
  
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<any>(null)
  const [evm, setEvm] = useState<any>(null)
  const [budget, setBudget] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [operations, setOperations] = useState<any[]>([])
  const [risks, setRisks] = useState<any[]>([])

  useEffect(() => {
    async function loadProjectDetails() {
      try {
        const { data: p } = await supabase.from('projects').select('*').eq('id', projectId).single()
        setProject(p)
        
        // Fetch EVM Data from API
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api'
        try {
          const evmRes = await fetch(`${apiUrl}/projects/${projectId}/evm`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (evmRes.ok) {
            const evmJson = await evmRes.json()
            setEvm(evmJson.summary)
            setTasks(evmJson.indicators || [])
          }
        } catch (e) {
          console.error("Erreur API EVM:", e)
        }
        
        const { data: b } = await supabase.from('v_budget_consumption').select('*').eq('project_id', projectId)
        if (b && b.length > 0) {
          const totalAllocated = b.reduce((sum: number, line: any) => sum + Number(line.initial_allocated_amount), 0)
          const totalConsumed = b.reduce((sum: number, line: any) => sum + Number(line.total_engage) + Number(line.total_decaisse), 0)
          setBudget({ totalAllocated, totalConsumed })
        }

        const { data: o } = await supabase.from('operations_journal').select('*').eq('project_id', projectId).order('date', { ascending: false }).limit(5)
        setOperations(o || [])

        const { data: r } = await supabase.from('risks').select('*').eq('project_id', projectId).eq('status', 'ouvert').order('criticality', { ascending: false })
        setRisks(r || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadProjectDetails()
  }, [projectId])



  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#1E3A5F" />
      </View>
    )
  }

  if (!project) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500">Projet introuvable</Text>
      </View>
    )
  }

  const cpi = evm?.cpi_global ?? 1
  const spi = evm?.spi_global ?? 1

  const menuItems = [
    { title: 'Paramètres', icon: 'settings-outline', route: 'ProjectSettings', color: '#6B7280' },
    { title: 'Cadre Logique', icon: 'options-outline', route: 'ProjectLogframe', color: '#3B82F6' },
    { title: 'PTBA', icon: 'calendar-outline', route: 'ProjectPtba', color: '#8B5CF6' },
    { title: 'Budget', icon: 'cash-outline', route: 'ProjectBudget', color: '#10B981' },
    { title: 'Opérations', icon: 'list-outline', route: 'ProjectOperations', color: '#F59E0B' },
    { title: 'Import Relevé', icon: 'download-outline', route: 'ProjectImport', color: '#6366F1' },
    { title: 'Suivi EVM', icon: 'bar-chart-outline', route: 'ProjectEvm', color: '#EC4899' },
    { title: 'Marchés', icon: 'briefcase-outline', route: 'ProjectProcurement', color: '#14B8A6' },
    { title: 'Risques', icon: 'warning-outline', route: 'ProjectRisks', color: '#EF4444' },
    { title: 'Audit', icon: 'search-outline', route: 'ProjectAudit', color: '#9CA3AF' },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white p-6 border-b border-gray-200">
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1">
            <Text className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{project.code || 'SANS CODE'}</Text>
            <Text className="text-xl font-bold text-primary">{project.name}</Text>
          </View>
          <View className="bg-primary/10 px-3 py-1 rounded-full ml-4">
            <Text className="text-primary font-bold text-xs capitalize">{project.status}</Text>
          </View>
        </View>
        
        <View className="flex-row flex-wrap mt-2">
          <View className="w-1/2 mb-4">
            <Text className="text-xs text-gray-500 mb-1">Budget Initial</Text>
            <Text className="text-base font-bold text-gray-800">{formatCurrency(budget?.totalAllocated || 0, project?.currency)}</Text>
          </View>
          <View>
            <Text className="text-xs text-gray-500">Consommé</Text>
            <Text className="text-base font-bold text-gray-800">{formatCurrency(budget?.totalConsumed || 0, project?.currency)}</Text>
          </View>
          
          <View className="w-1/2">
            <Text className="text-xs text-gray-500 mb-1">CPI</Text>
            <Text className={`text-base font-bold ${cpi < 1 ? 'text-red-600' : 'text-green-600'}`}>
              {cpi.toFixed(2)}
            </Text>
          </View>
          <View className="w-1/2">
            <Text className="text-xs text-gray-500 mb-1">SPI</Text>
            <Text className={`text-base font-bold ${spi < 1 ? 'text-red-600' : 'text-green-600'}`}>
              {spi.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View className="p-4 mt-2 pb-10">
        <Text className="font-bold text-lg text-primary mb-4">Modules du Projet</Text>
        
        <View className="flex-row flex-wrap justify-between">
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              className="bg-white w-[48%] p-4 rounded-xl shadow-sm border border-gray-100 mb-4 items-center justify-center"
              style={{ minHeight: 110 }}
              onPress={() => navigation.navigate(item.route, { projectId })}
            >
              <View 
                className="w-12 h-12 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: `${item.color}15` }}
              >
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text className="font-bold text-gray-800 text-center text-sm">{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}
