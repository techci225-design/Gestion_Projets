import React, { useState, useEffect } from 'react'
import { View, Text, SafeAreaView, ScrollView, Dimensions, ActivityIndicator, FlatList } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { supabase } from '../../../lib/supabase'
import { LineChart } from 'react-native-chart-kit'
import { formatCurrency } from '../../../lib/utils'

const screenWidth = Dimensions.get('window').width

export function ProjectEvmScreen() {
  const route = useRoute<any>()
  const { projectId } = route.params
  
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const [project, setProject] = useState<any>(null)
  
  useEffect(() => {
    async function loadData() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api'
        const evmRes = await fetch(`${apiUrl}/projects/${projectId}/evm`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (evmRes.ok) {
          const evmJson = await evmRes.json()
          setTasks(evmJson.indicators || [])
        }
        
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

  // Generate chart data (mocking the time series based on tasks for demonstration)
  // In a real app we would use historical snapshots. Here we just plot EV vs PV vs AC across tasks
  const chartData = {
    labels: tasks.map(t => (t.code || t.description || '').substring(0, 5) + '...'),
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
              <Text className="font-bold text-primary text-base mb-2">{item.code ? item.code + ' - ' : ''}{item.description}</Text>
              <View className="flex-row justify-between mb-2">
                <View>
                  <Text className="text-xs text-gray-500">CPI</Text>
                  <Text className={`font-bold ${item.cpi === null ? 'text-gray-500' : (item.cpi >= 1 ? 'text-green-600' : 'text-red-600')}`}>
                    {item.cpi === null ? 'N/A' : Number(item.cpi).toFixed(2)}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs text-gray-500">SPI</Text>
                  <Text className={`font-bold ${item.spi === null ? 'text-gray-500' : (item.spi >= 1 ? 'text-green-600' : 'text-red-600')}`}>
                    {item.spi === null ? 'N/A' : Number(item.spi).toFixed(2)}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs text-gray-500">Avancement</Text>
                  <Text className="font-bold text-gray-800">{Number(item.percent_complete || 0).toFixed(0)}%</Text>
                </View>
              </View>
              
              <View className="flex-row justify-between bg-gray-50 p-2 rounded mt-2">
                <View>
                  <Text className="text-[10px] text-gray-500">PV</Text>
                  <Text className="text-xs font-bold text-gray-700">{formatCurrency(item.pv, project?.currency, true)}</Text>
                </View>
                <View>
                  <Text className="text-[10px] text-gray-500">EV</Text>
                  <Text className="text-xs font-bold text-gray-700">{formatCurrency(item.ev, project?.currency, true)}</Text>
                </View>
                <View>
                  <Text className="text-[10px] text-gray-500">AC</Text>
                  <Text className="text-xs font-bold text-gray-700">{formatCurrency(item.ac, project?.currency, true)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
