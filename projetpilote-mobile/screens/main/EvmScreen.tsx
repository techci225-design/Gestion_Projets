import React, { useState, useEffect } from 'react'
import { View, Text, SafeAreaView, ScrollView, FlatList, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native'
import { supabase } from '../../lib/supabase'
import { LineChart } from 'react-native-chart-kit'

const screenWidth = Dimensions.get('window').width

export function EvmScreen() {
  const [tasks, setTasks] = useState<any[]>([])
  const [kpis, setKpis] = useState({ bac: 0, eac: 0, vac: 0 })
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

        const { data: evmTasks, error } = await supabase
          .from('v_evm_tasks')
          .select('*')
          .eq('project_id', activeProjectId)
        
        if (error) throw error

        let bac = 0, eac = 0, vac = 0
        evmTasks?.forEach(t => {
          bac += Number(t.budget_allocated) || 0
          eac += Number(t.eac) || 0
        })
        vac = bac - eac

        setTasks(evmTasks || [])
        setKpis({ bac, eac, vac })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [selectedProjectId])

  const formatFCFA = (amount: number) => {
    if (!amount) return '0'
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' F'
  }

  if (loading && projects.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#1E3A5F" />
      </SafeAreaView>
    )
  }

  const chartData = {
    labels: tasks.length > 0 ? tasks.map(t => (t.name || '').substring(0, 5) + '..') : ['Aucune'],
    datasets: [
      {
        data: tasks.length > 0 ? tasks.map(t => Number(t.pv) || 0) : [0],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2
      },
      {
        data: tasks.length > 0 ? tasks.map(t => Number(t.ev) || 0) : [0],
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 2
      },
      {
        data: tasks.length > 0 ? tasks.map(t => Number(t.ac) || 0) : [0],
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        strokeWidth: 2
      }
    ]
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

      <FlatList
        data={tasks}
        keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
              <View className="bg-primary/5 p-4 rounded-lg min-w-[110px] mr-4">
                <Text className="text-xs text-gray-500 mb-1">BAC</Text>
                <Text className="text-lg font-bold text-primary">{formatFCFA(kpis.bac)}</Text>
              </View>
              <View className="bg-primary/5 p-4 rounded-lg min-w-[110px] mr-4">
                <Text className="text-xs text-gray-500 mb-1">EAC</Text>
                <Text className="text-lg font-bold text-primary">{formatFCFA(kpis.eac)}</Text>
              </View>
              <View className={`p-4 rounded-lg min-w-[110px] ${kpis.vac < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <Text className={`text-xs mb-1 ${kpis.vac < 0 ? 'text-red-700' : 'text-green-700'}`}>VAC</Text>
                <Text className={`text-lg font-bold ${kpis.vac < 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {kpis.vac > 0 ? '+' : ''}{formatFCFA(kpis.vac)}
                </Text>
              </View>
            </ScrollView>

            {tasks.length > 0 && (
              <View className="mb-4 bg-white rounded-xl shadow-sm border border-gray-100 p-2">
                <LineChart
                  data={chartData}
                  width={screenWidth - 36}
                  height={180}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(30, 58, 95, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    propsForDots: { r: "3" }
                  }}
                  bezier
                  style={{ borderRadius: 16 }}
                />
              </View>
            )}
            <Text className="text-lg font-bold text-primary mb-2">Détails des tâches</Text>
          </>
        }
        renderItem={({ item }) => (
          <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3">
            <Text className="font-bold text-primary text-base mb-2">{item?.name || 'Tâche'}</Text>
            <View className="flex-row justify-between">
              <View>
                <Text className="text-xs text-gray-500">CPI</Text>
                <Text className={`font-bold ${item.cpi >= 1 ? 'text-green-600' : item.cpi >= 0.9 ? 'text-orange-500' : 'text-red-600'}`}>
                  {item.cpi ? String(Number(item.cpi).toFixed(2)) : '1.00'}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-500">SPI</Text>
                <Text className={`font-bold ${item.spi >= 1 ? 'text-green-600' : item.spi >= 0.9 ? 'text-orange-500' : 'text-red-600'}`}>
                  {item.spi ? String(Number(item.spi).toFixed(2)) : '1.00'}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-500">EV</Text>
                <Text className="font-bold text-gray-800">{formatFCFA(item.ev || 0)}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center p-8 mt-10">
            <Text className="text-gray-400 text-base text-center">
              Aucune tâche EVM disponible pour ce projet.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}
