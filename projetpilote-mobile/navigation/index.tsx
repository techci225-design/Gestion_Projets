import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { useAuth } from '../providers/AuthProvider'
import { AuthStack } from './AuthStack'
import { MainStack } from './MainStack'
import { View, ActivityIndicator } from 'react-native'

export function Navigation() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1E3A5F" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {session ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  )
}
