import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { PortefeuilleScreen } from '../screens/main/PortefeuilleScreen'
import { BudgetScreen } from '../screens/main/BudgetScreen'
import { EvmScreen } from '../screens/main/EvmScreen'
import { RisquesScreen } from '../screens/main/RisquesScreen'
import { MoreScreen } from '../screens/main/MoreScreen'

const Tab = createBottomTabNavigator()

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#1E3A5F' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#1E3A5F',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Portefeuille') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Budget') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else if (route.name === 'EVM') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Risques') {
            iconName = focused ? 'warning' : 'warning-outline';
          } else if (route.name === 'Plus') {
            iconName = focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Portefeuille" 
        component={PortefeuilleScreen} 
        options={{ title: 'Accueil' }} 
      />
      <Tab.Screen 
        name="Budget" 
        component={BudgetScreen} 
        options={{ title: 'Budget' }} 
      />
      <Tab.Screen 
        name="EVM" 
        component={EvmScreen} 
        options={{ title: 'EVM' }} 
      />
      <Tab.Screen 
        name="Risques" 
        component={RisquesScreen} 
        options={{ title: 'Risques' }} 
      />
      <Tab.Screen 
        name="Plus" 
        component={MoreScreen} 
        options={{ title: 'Plus' }} 
      />
    </Tab.Navigator>
  )
}
