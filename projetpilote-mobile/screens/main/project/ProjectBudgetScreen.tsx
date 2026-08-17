import React, { useState, useEffect } from 'react'
import { View, Text, SafeAreaView, FlatList, ActivityIndicator } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { supabase } from '../../../lib/supabase'
import { formatCurrency } from '../../../lib/utils'

export function ProjectBudgetScreen() {
  const route = useRoute<any>()
  const { projectId } = route.params
  
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState<any[]>([])
  const [project, setProject] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const { data } = await supabase.from('budget_lines').select('*').eq('project_id', projectId)
        setLines(data || [])
        
        const { data: p } = await supabase.from('projects').select('currency').eq('id', projectId).single()
        setProject(p)
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

  const totalAllocated = lines.reduce((sum, l) => sum + (Number(l.initial_allocated_amount) || 0), 0)
  const totalConsumed = lines.reduce((sum, l) => sum + (Number(l.total_engage) || 0) + (Number(l.total_decaisse) || 0), 0)

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-primary mb-2">Lignes Budgétaires du Projet</Text>
        <View className="flex-row justify-between mt-2">
          <View>
            <Text className="text-gray-500 text-xs">Alloué</Text>
            <Text className="text-lg font-bold text-gray-800">{formatCurrency(totalAllocated, project?.currency, true)}</Text>
          </View>
          <View>
            <Text className="text-gray-500 text-xs">Consommé (Engagé + Décaissé)</Text>
            <Text className="text-lg font-bold text-primary">{formatCurrency(totalConsumed, project?.currency, true)}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={lines}
        keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3">
            <Text className="font-bold text-primary text-base mb-2">{item?.description || 'Ligne sans nom'}</Text>
            <View className="flex-row justify-between bg-gray-50 p-2 rounded">
              <View>
                <Text className="text-[10px] text-gray-500">Alloué</Text>
                <Text className="text-xs font-bold text-gray-700">{formatCurrency(item.initial_allocated_amount, project?.currency, true)}</Text>
              </View>
              <View>
                <Text className="text-[10px] text-gray-500">Engagé</Text>
                <Text className="text-xs font-bold text-gray-700">{formatCurrency(item.total_engage, project?.currency, true)}</Text>
              </View>
              <View>
                <Text className="text-[10px] text-gray-500">Décaissé</Text>
                <Text className="text-xs font-bold text-gray-700">{formatCurrency(item.total_decaisse, project?.currency, true)}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center p-8 mt-10">
            <Text className="text-gray-400 text-base text-center">Aucune ligne budgétaire trouvée.</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}
