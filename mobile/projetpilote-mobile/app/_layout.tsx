import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { syncOfflineOperations } from '../lib/sync';
import { ToastAndroid, Platform } from 'react-native';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1E3A5F',
    secondary: '#16A34A',
  },
};

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        syncOfflineOperations().then(count => {
          if (count > 0) {
            if (Platform.OS === 'android') {
              ToastAndroid.show(`${count} opération(s) synchronisée(s) !`, ToastAndroid.SHORT);
            } else {
              // Dans une app complète on utiliserait un Toast React Native Paper
              console.log(`${count} opération(s) synchronisée(s) !`);
            }
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="projects/[id]" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}
