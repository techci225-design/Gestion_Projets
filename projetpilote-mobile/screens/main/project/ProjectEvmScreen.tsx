import React, { useState, useEffect } from 'react'
import { View, Text, SafeAreaView, ScrollView, Dimensions, ActivityIndicator, FlatList } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { supabase } from '../../../lib/supabase'
import { LineChart } from 'react-native-chart-kit'

const screenWidth = Dimensions.get('window').width

export function ProjectEvmScreen() {
  const route = useRoute<any>()
  const { projectId } = route.params
  
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  
  useEffect(() => {
    async function loadData() {
      try {
        const { data } = await supabase.from('v_evm_tasks').select('*').eq('project_id', projectId)
        setTasks(data || [])
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

  // Generate chart data (mocking the time series based on tasks for demonstration)
  // In a real app we would use historical snapshots. Here we just plot EV vs PV vs AC across tasks
  const chartData = {
    labels: tasks.map(t => t.name.substring(0, 5) + '...'),
    datasets: [
      {
        data: tasks.map(t => Number(t.pv) || 0),
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // PV in purple
        strokeWidth: 2
      },
      {
        data: tasks.map(t => Number(t.ev) || 0),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // EV in green
        strokeWidth: 2
      },
      {
        data: tasks.map(t => Number(t.ac) || 0),
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // AC in red
        strokeWidth: 2
      }
    ],
    legend: ["Valeur Planifiée (PV)", "Valeur Acquise (EV)", "Coût Réel (AC)"]
  }

  const formatFCFA = (amount: number) => {
    if (!amount) return '0'
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' F'
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView>
        <View className="p-4 bg-white border-b border-gray-200">
          <Text className="text-lg font-bold text-primary mb-2">Courbes S (Performances)</Text>
          {tasks.length > 0 ? (
            <LineChart
              data={chartData}
              width={screenWidth - 32}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(30, 58, 95, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "3", strokeWidth: "1", stroke: "#fff" }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          ) : (
            <Text className="text-gray-500 italic">Pas assez de données pour générer le graphique.</Text>
          )}
        </View>

        <View className="p-4">
          <Text className="text-lg font-bold text-primary mb-4">Détails des Tâches</Text>
          {tasks.map((item, index) => (
            <View key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3">
              <Text className="font-bold text-primary text-base mb-2">{item.name}</Text>
              <View className="flex-row justify-between mb-2">
                <View>
                  <Text className="text-xs text-gray-500">CPI</Text>
                  <Text className={`font-bold ${item.cpi >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.cpi ? Number(item.cpi).toFixed(2) : '1.00'}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs text-gray-500">SPI</Text>
                  <Text className={`font-bold ${item.spi >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.spi ? Number(item.spi).toFixed(2) : '1.00'}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs text-gray-500">Avancement</Text>
                  <Text className="font-bold text-gray-800">{Number(item.progress_percentage || 0).toFixed(0)}%</Text>
                </View>
              </View>
              
              <View className="flex-row justify-between bg-gray-50 p-2 rounded mt-2">
                <View>
                  <Text className="text-[10px] text-gray-500">PV</Text>
                  <Text className="text-xs font-bold text-gray-700">{formatFCFA(item.pv)}</Text>
                </View>
                <View>
                  <Text className="text-[10px] text-gray-500">EV</Text>
                  <Text className="text-xs font-bold text-gray-700">{formatFCFA(item.ev)}</Text>
                </View>
                <View>
                  <Text className="text-[10px] text-gray-500">AC</Text>
                  <Text className="text-xs font-bold text-gray-700">{formatFCFA(item.ac)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
