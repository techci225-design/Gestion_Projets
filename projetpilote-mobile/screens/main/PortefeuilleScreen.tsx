import React, { useState, useEffect } from 'react'
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, RefreshControl, ScrollView, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useNavigation } from '@react-navigation/native'

export function PortefeuilleScreen() {
  const [projects, setProjects] = useState<any[]>([])
  const [kpis, setKpis] = useState({ actifs: 0, budget: 0, cpi: 0, spi: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const navigation = useNavigation<any>()

  const fetchProjects = async () => {
    try {
      const { data: projectList, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'actif')

      if (error) throw error

      const projectIds = projectList?.map(p => p.id) || []

      let evmSummaries: any[] = []
      let budgetConsumption: any[] = []
      let risksData: any[] = []

      if (projectIds.length > 0) {
        const { data: es } = await supabase.from('v_evm_project_summary').select('*').in('project_id', projectIds)
        evmSummaries = es || []

        const { data: bc } = await supabase.from('v_budget_consumption').select('project_id, total_engage, total_decaisse, initial_allocated_amount').in('project_id', projectIds)
        budgetConsumption = bc || []

        const { data: r } = await supabase.from('risks').select('project_id').eq('status', 'ouvert').eq('criticality', 9).in('project_id', projectIds)
        risksData = r || []
      }

      let sumBacCpi = 0
      let sumBacSpi = 0
      let totalBacForAvg = 0
      
      const projectsData = projectList?.map(p => {
        const summary = evmSummaries.find(s => s.project_id === p.id)
        const pBudgetConsumption = budgetConsumption.filter(bc => bc.project_id === p.id)
        
        const pTotalBudget = pBudgetConsumption.reduce((sum, bc) => sum + Number(bc.initial_allocated_amount), 0)
        const pTotalConsumed = pBudgetConsumption.reduce((sum, bc) => sum + Number(bc.total_engage) + Number(bc.total_decaisse), 0)
        const pTauxConso = pTotalBudget > 0 ? pTotalConsumed / pTotalBudget : 0
        
        const pRisks = risksData.filter(r => r.project_id === p.id)
        
        const bac = summary?.bac_total || 0
        const cpi = summary?.cpi_global ?? 1
        const spi = summary?.spi_global ?? 1

        if (bac > 0) {
          sumBacCpi += cpi * bac
          sumBacSpi += spi * bac
          totalBacForAvg += bac
        }

        const alertReasons = []
        if (cpi < 0.9) alertReasons.push(`CPI = ${cpi.toFixed(2)}`)
        if (spi < 0.9) alertReasons.push(`SPI = ${spi.toFixed(2)}`)
        if (pTauxConso > 1.0) alertReasons.push(`Conso = ${(pTauxConso * 100).toFixed(0)}%`)
        if (pRisks.length > 0) alertReasons.push(`${pRisks.length} Risque(s)`)

        return {
          ...p,
          cpi,
          spi,
          pTotalBudget,
          pTotalConsumed,
          pTauxConso,
          isAlert: alertReasons.length > 0,
          alertReasons
        }
      }) || []

      const avgCpi = totalBacForAvg > 0 ? sumBacCpi / totalBacForAvg : 1
      const avgSpi = totalBacForAvg > 0 ? sumBacSpi / totalBacForAvg : 1
      const totalBudgetActif = projectsData.reduce((sum, p) => sum + p.pTotalBudget, 0)
      
      setProjects(projectsData)
      setKpis({
        actifs: projectsData.length,
        budget: totalBudgetActif,
        cpi: avgCpi, 
        spi: avgSpi  
      })
    } catch (e) {
      console.error(e)
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

  const formatFCFA = (amount: number) => {
    if (!amount) return '0 FCFA';
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' FCFA';
  }

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
            <Text className="text-xl font-bold text-primary">{String(kpis.actifs)}</Text>
          </View>
          <View className="bg-primary/5 p-4 rounded-lg min-w-[150px] mr-4">
            <Text className="text-xs text-gray-500 mb-1">Budget Total</Text>
            <Text className="text-xl font-bold text-primary">{formatFCFA(kpis.budget)}</Text>
          </View>
          <View className="bg-green-50 p-4 rounded-lg min-w-[100px] mr-4">
            <Text className="text-xs text-green-700 mb-1">CPI Moyen</Text>
            <Text className="text-xl font-bold text-green-700">{String(kpis.cpi.toFixed(2))}</Text>
          </View>
          <View className="bg-green-50 p-4 rounded-lg min-w-[100px]">
            <Text className="text-xs text-green-700 mb-1">SPI Moyen</Text>
            <Text className="text-xl font-bold text-green-700">{String(kpis.spi.toFixed(2))}</Text>
          </View>
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
              <View className={`px-2 py-1 rounded mr-2 ${item.cpi < 1 ? 'bg-red-100' : 'bg-green-100'}`}>
                <Text className={`text-xs font-bold ${item.cpi < 1 ? 'text-red-700' : 'text-green-700'}`}>
                  CPI {item.cpi ? String(item.cpi.toFixed(2)) : '1.00'}
                </Text>
              </View>
              <View className={`px-2 py-1 rounded mr-2 ${item.spi < 1 ? 'bg-red-100' : 'bg-green-100'}`}>
                <Text className={`text-xs font-bold ${item.spi < 1 ? 'text-red-700' : 'text-green-700'}`}>
                  SPI {item.spi ? String(item.spi.toFixed(2)) : '1.00'}
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
