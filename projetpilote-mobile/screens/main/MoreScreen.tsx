import React from 'react'
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

export function MoreScreen() {
  const navigation = useNavigation<any>()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const menuItems = [
    { title: 'Journal des opérations', icon: 'list', route: 'Journal' },
    { title: 'Cadre Logique', icon: 'options', route: null },
    { title: 'PTBA', icon: 'calendar', route: null },
    { title: 'Passation des Marchés', icon: 'briefcase', route: null },
    { title: 'Membres', icon: 'people', route: null },
    { title: 'Paramètres', icon: 'settings', route: null },
  ]

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="p-4 flex-1">
        <Text className="text-xl font-bold text-primary mb-6">Autres Modules</Text>
        
        <View className="flex-1 mb-8">
          {menuItems.map((item, i) => (
            <TouchableOpacity 
              key={i}
              className="flex-row items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3"
              onPress={() => item.route && navigation.navigate(item.route)}
            >
              <View className="bg-primary/10 w-10 h-10 rounded-full items-center justify-center mr-4">
                <Ionicons name={item.icon as any} size={20} color="#1E3A5F" />
              </View>
              <Text className="flex-1 font-bold text-gray-800">{item.title}</Text>
              {!item.route && <Text className="text-xs text-gray-400 italic">Bientôt</Text>}
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          className="bg-red-50 p-4 rounded-xl items-center flex-row justify-center mt-auto mb-10"
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <Text className="text-red-600 font-bold">Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
