import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'

export function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="flex-1 justify-center p-6">
        <View className="bg-white rounded-xl p-6 shadow-sm">
          <Text className="text-2xl font-bold text-center text-primary mb-6">Connexion</Text>
          
          {error ? (
            <View className="bg-red-50 p-3 rounded-lg mb-4 border border-red-200">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          ) : null}

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <TextInput
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white"
              placeholder="votre@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-1">Mot de passe</Text>
            <TextInput
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            className="w-full bg-primary py-3 rounded-lg flex-row justify-center items-center"
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Se connecter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            className="mt-4 items-center"
            onPress={() => navigation.navigate('Register')}
          >
            <Text className="text-primary font-medium">Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}
