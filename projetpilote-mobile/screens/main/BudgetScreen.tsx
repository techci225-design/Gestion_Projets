import React, { useState, useEffect } from 'react'
import { View, Text, SafeAreaView, ScrollView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'

export function BudgetScreen() {
  const [budgets, setBudgets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: p } = await supabase.from('projects').select('id, name, code, currency').eq('status', 'actif')
        if (!p || p.length === 0) return
        setProjects(p)

        const activeProjectId = selectedProjectId || p[0].id
        if (!selectedProjectId) setSelectedProjectId(activeProjectId)

        const { data: budgetLines, error } = await supabase
          .from('budget_lines')
          .select('*')
          .eq('project_id', activeProjectId)
        
        if (error) throw error

        setBudgets(budgetLines || [])
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

  const totalAllocated = budgets.reduce((sum, b) => sum + (Number(b.initial_allocated_amount) || 0), 0)

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
        <Text className="text-xl font-bold text-primary mb-2">Lignes Budgétaires</Text>
        <Text className="text-gray-500 mb-1">Budget Total {projects.find(p => p.id === selectedProjectId)?.currency ? `(${projects.find(p => p.id === selectedProjectId)?.currency})` : ''}</Text>
        <Text className="text-2xl font-bold text-green-700">{formatCurrency(totalAllocated, projects.find(p => p.id === selectedProjectId)?.currency, true)}</Text>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3">
            <Text className="font-bold text-primary text-base mb-2">{item?.description || 'Ligne budgétaire'}</Text>
            <View className="flex-row justify-between items-center mt-2">
              <View>
                <Text className="text-xs text-gray-500">Alloué</Text>
                <Text className="font-bold text-gray-800">{formatCurrency(item.initial_allocated_amount || 0, projects.find(p => p.id === selectedProjectId)?.currency, true)}</Text>
              </View>
              <View className="bg-primary/10 px-2 py-1 rounded">
                <Text className="text-primary text-xs font-bold capitalize">{item.status || 'actif'}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center p-8 mt-10">
            <Text className="text-gray-400 text-base text-center">
              Aucune ligne budgétaire trouvée.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}
