import React, { useState, useEffect } from 'react'
import { View, Text, SafeAreaView, FlatList, ActivityIndicator } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { supabase } from '../../../lib/supabase'

export function ProjectRisksScreen() {
  const route = useRoute<any>()
  const { projectId } = route.params
  
  const [loading, setLoading] = useState(true)
  const [risks, setRisks] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const { data } = await supabase
          .from('risks')
          .select('*')
          .eq('project_id', projectId)
          .order('status', { ascending: false }) // 'ouvert' before 'ferme'
          .order('criticality', { ascending: false })
        
        setRisks(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [projectId])

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#1E3A5F" />
      </View>
    )
  }

  const getCriticalityColor = (crit: number, status: string) => {
    if (status !== 'ouvert') return 'bg-gray-100 text-gray-500'
    if (crit >= 8) return 'bg-red-100 text-red-700'
    if (crit >= 5) return 'bg-orange-100 text-orange-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-primary mb-2">Registre des Risques</Text>
        <View className="flex-row gap-4 mt-2">
          <View>
            <Text className="text-gray-500 text-xs">Total</Text>
            <Text className="text-lg font-bold text-gray-800">{risks.length}</Text>
          </View>
          <View>
            <Text className="text-gray-500 text-xs">Ouverts</Text>
            <Text className="text-lg font-bold text-red-600">{risks.filter(r => r.status === 'ouvert').length}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={risks}
        keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const colorClass = getCriticalityColor(Number(item.criticality) || 0, item.status)
          const bgColor = colorClass.split(' ')[0]
          const textColor = colorClass.split(' ')[1]

          return (
            <View className={`bg-white p-4 rounded-xl shadow-sm border ${item.status === 'ouvert' ? 'border-red-100' : 'border-gray-200'} mb-3`}>
              <View className="flex-row justify-between items-start mb-2">
                <Text className={`font-bold text-base flex-1 pr-2 ${item.status === 'ouvert' ? 'text-gray-900' : 'text-gray-400'}`}>
                  {item.description}
                </Text>
                <View className={`px-2 py-1 rounded ${bgColor}`}>
                  <Text className={`text-xs font-bold ${textColor}`}>
                    Crit: {item.criticality || 0}
                  </Text>
                </View>
              </View>
              
              <View className="flex-row justify-between mt-2 mb-2">
                <Text className="text-xs text-gray-500">Probabilité: {item.probability || 0}</Text>
                <Text className="text-xs text-gray-500">Impact: {item.impact || 0}</Text>
                <Text className="text-xs text-gray-500 font-bold capitalize">{item.status}</Text>
              </View>

              {item.mitigation_plan && (
                <View className="bg-gray-50 p-2 rounded mt-2 border border-gray-100">
                  <Text className="text-xs text-gray-700 italic">Atténuation: {item.mitigation_plan}</Text>
                </View>
              )}
            </View>
          )
        }}
        ListEmptyComponent={
          <View className="items-center justify-center p-8 mt-10">
            <Text className="text-gray-400 text-base text-center">Aucun risque n'a été identifié pour ce projet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}
