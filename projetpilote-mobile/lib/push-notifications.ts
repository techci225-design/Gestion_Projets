import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: '00000000-0000-0000-0000-000000000000' // Use a dummy valid UUID to avoid 400 validation error in dev if EAS is not configured
        })).data;
      } catch (e) {
        console.log("Could not fetch Expo Push Token (EAS not fully configured yet). Skipping push registration.");
      }
      
      // Enregistrer le token dans Supabase
      if (token) {
        await supabase
          .from('profiles')
          .update({ expo_push_token: token })
          .eq('id', userId)
      }
    } catch (error) {
      console.log('Push notifications are not supported in Expo Go on SDK 53+ or an error occurred:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
