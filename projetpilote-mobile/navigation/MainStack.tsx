import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { MainTabs } from './MainTabs'
import { JournalScreen } from '../screens/main/JournalScreen'

const Stack = createNativeStackNavigator()

export function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="Journal" 
        component={JournalScreen} 
        options={{ 
          headerShown: true, 
          title: 'Journal des opérations',
          headerBackTitle: 'Retour',
          headerTintColor: '#1E3A5F'
        }} 
      />
    </Stack.Navigator>
  )
}
