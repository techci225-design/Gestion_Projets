import React from 'react'
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native'

export function RegisterScreen({ navigation }: any) {
  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="flex-1 justify-center p-6">
        <View className="bg-white rounded-xl p-6 shadow-sm">
          <Text className="text-2xl font-bold text-center text-primary mb-6">Créer un compte</Text>
          
          <Text className="text-gray-600 text-center mb-6">
            L'inscription se fait actuellement depuis l'application web pour créer votre organisation.
          </Text>

          <TouchableOpacity 
            className="mt-4 items-center"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-primary font-medium">Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}
