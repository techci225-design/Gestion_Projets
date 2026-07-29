import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "ProjetPilote",
  slug: "projetpilote",
  version: "1.0.0",
  icon: "./assets/icon.png",
  splash: { 
    backgroundColor: "#1E3A5F",
    image: "./assets/splash-icon.png",
    resizeMode: "contain"
  },
  android: {
    package: "com.tsbc.projetpilote",
    adaptiveIcon: { 
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundColor: "#1E3A5F" 
    }
  },
  ios: {
    bundleIdentifier: "com.tsbc.projetpilote"
  },
  plugins: [
    "expo-image-picker",
    "expo-camera",
    "expo-document-picker",
    "expo-notifications"
  ]
});
