import React, { useState, useEffect } from 'react'
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, RefreshControl, ScrollView, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useNavigation } from '@react-navigation/native'

export function PortefeuilleScreen() {
  const [projects, setProjects] = useState<any[]>([])
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const navigation = useNavigation<any>()

  const fetchProjects = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api'
      const evmRes = await fetch(`${apiUrl}/evm/portfolio`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (evmRes.ok) {
        const evmJson = await evmRes.json()
        setProjects(evmJson.projects || [])
        setPortfolios(evmJson.portfolio || [])
      } else {
        setProjects([])
        setPortfolios([])
      }
    } catch (e) {
      console.error("Erreur chargement portfolio:", e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchProjects()
  }

import { formatCurrency } from '../../lib/utils'

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#1E3A5F" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <View className="bg-primary/5 p-4 rounded-lg min-w-[120px] mr-4">
            <Text className="text-xs text-gray-500 mb-1">Projets actifs</Text>
            <Text className="text-xl font-bold text-primary">{String(projects.length)}</Text>
          </View>
          {portfolios.map(port => (
            <React.Fragment key={port.currency}>
              <View className="bg-primary/5 p-4 rounded-lg min-w-[150px] mr-4">
                <Text className="text-xs text-gray-500 mb-1">Budget Total {portfolios.length > 1 ? `(${port.currency})` : ''}</Text>
                <Text className="text-xl font-bold text-primary">{formatCurrency(port.bac, port.currency, true)}</Text>
              </View>
              <View className="bg-green-50 p-4 rounded-lg min-w-[100px] mr-4">
                <Text className="text-xs text-green-700 mb-1">CPI Moyen {portfolios.length > 1 ? `(${port.currency})` : ''}</Text>
                <Text className={`text-xl font-bold ${port.cpi === null ? 'text-gray-500' : (port.cpi >= 1 ? 'text-green-700' : 'text-red-700')}`}>
                  {port.cpi === null ? 'N/A' : port.cpi.toFixed(2)}
                </Text>
              </View>
              <View className="bg-green-50 p-4 rounded-lg min-w-[100px] mr-4">
                <Text className="text-xs text-green-700 mb-1">SPI Moyen {portfolios.length > 1 ? `(${port.currency})` : ''}</Text>
                <Text className={`text-xl font-bold ${port.spi === null ? 'text-gray-500' : (port.spi >= 1 ? 'text-green-700' : 'text-red-700')}`}>
                  {port.spi === null ? 'N/A' : port.spi.toFixed(2)}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3"
            onPress={() => navigation.navigate('Budget')}
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 pr-4">
                <Text className="font-bold text-primary text-base">{item?.name || 'Projet sans nom'}</Text>
                <Text className="text-gray-500 text-xs mt-1">{item?.code || 'SANS CODE'}</Text>
              </View>
            </View>
            
            <View className="mt-4 flex-row">
              <View className={`px-2 py-1 rounded mr-2 ${item.cpi === null ? 'bg-gray-100' : (item.cpi < 1 ? 'bg-red-100' : 'bg-green-100')}`}>
                <Text className={`text-xs font-bold ${item.cpi === null ? 'text-gray-500' : (item.cpi < 1 ? 'text-red-700' : 'text-green-700')}`}>
                  CPI {item.cpi === null ? 'N/A' : String(Number(item.cpi).toFixed(2))}
                </Text>
              </View>
              <View className={`px-2 py-1 rounded mr-2 ${item.spi === null ? 'bg-gray-100' : (item.spi < 1 ? 'bg-red-100' : 'bg-green-100')}`}>
                <Text className={`text-xs font-bold ${item.spi === null ? 'text-gray-500' : (item.spi < 1 ? 'text-red-700' : 'text-green-700')}`}>
                  SPI {item.spi === null ? 'N/A' : String(Number(item.spi).toFixed(2))}
                </Text>
              </View>
              {item.isAlert && (
                <View className="bg-yellow-100 px-2 py-1 rounded">
                  <Text className="text-yellow-700 text-xs font-bold">Alerte</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center p-8 mt-10">
            <Text className="text-gray-400 text-base text-center">
              Aucun projet actif trouvé. Créez-en un nouveau ou importez des données.
            </Text>
          </View>
        }
      />

      <TouchableOpacity 
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
        onPress={() => console.log('Create Project')}
      >
        <Text className="text-white text-3xl pb-1">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
