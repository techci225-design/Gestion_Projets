import React, { useState, useEffect } from 'react'
import { View, Text, SafeAreaView, ScrollView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native'
import { supabase } from '../../lib/supabase'

export function RisquesScreen() {
  const [risks, setRisks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: p } = await supabase.from('projects').select('id, name, code').eq('status', 'actif')
        if (!p || p.length === 0) return
        setProjects(p)

        const activeProjectId = selectedProjectId || p[0].id
        if (!selectedProjectId) setSelectedProjectId(activeProjectId)

        const { data: risksData, error } = await supabase
          .from('risks')
          .select('*')
          .eq('project_id', activeProjectId)
          .eq('status', 'ouvert')
        
        if (error) throw error

        const sortedRisks = (risksData || []).sort((a, b) => Number(b.criticality) - Number(a.criticality))

        setRisks(sortedRisks)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [selectedProjectId])

  if (loading && projects.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#1E3A5F" />
      </SafeAreaView>
    )
  }

  const getCriticalityColor = (crit: number) => {
    if (crit >= 8) return 'bg-red-100 text-red-700'
    if (crit >= 5) return 'bg-orange-100 text-orange-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3">
          {projects.map((p) => (
            <TouchableOpacity 
              key={p.id}
              onPress={() => { setLoading(true); setSelectedProjectId(p.id); }}
              className={`px-4 py-2 rounded-full mr-2 border ${selectedProjectId === p.id ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}
            >
              <Text className={`font-bold ${selectedProjectId === p.id ? 'text-white' : 'text-gray-600'}`}>
                {p.code || p.name.substring(0, 15)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View className="p-4 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-primary mb-1">Risques Ouverts</Text>
        <Text className="text-gray-500 text-sm">Vue des risques pour le projet sélectionné</Text>
      </View>

      <FlatList
        data={risks}
        keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 pr-2">
                <Text className="font-bold text-primary text-base">{item?.description || 'Risque sans description'}</Text>
              </View>
              <View className={`px-2 py-1 rounded ${getCriticalityColor(Number(item.criticality) || 0).split(' ')[0]}`}>
                <Text className={`text-xs font-bold ${getCriticalityColor(Number(item.criticality) || 0).split(' ')[1]}`}>
                  Criticité: {item.criticality || 0}
                </Text>
              </View>
            </View>
            
            <View className="mt-2">
              <Text className="text-xs text-gray-500">Probabilité: {item.probability || 0} / Impact: {item.impact || 0}</Text>
              {item.mitigation_plan && (
                <Text className="text-sm text-gray-700 mt-2 italic bg-gray-50 p-2 rounded">
                  Atténuation: {item.mitigation_plan}
                </Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center p-8 mt-10">
            <Text className="text-gray-400 text-base text-center">
              Aucun risque ouvert trouvé pour ce projet.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}
