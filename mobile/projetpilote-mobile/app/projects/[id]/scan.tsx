import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Utiliser EXPO_PUBLIC_GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginBottom: 16 }}>Nous avons besoin de votre permission pour utiliser la caméra</Text>
        <Button mode="contained" onPress={requestPermission}>Autoriser la caméra</Button>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setLoading(true);
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        
        // Compression de l'image pour l'API Gemini
        if(photo) {
            const manipResult = await manipulateAsync(
            photo.uri,
            [{ resize: { width: 800 } }],
            { compress: 0.7, format: SaveFormat.JPEG, base64: true }
            );

            await analyzeImage(manipResult.base64!);
        }

      } catch (error) {
        console.error(error);
        Alert.alert('Erreur', 'Impossible de traiter la photo');
        setLoading(false);
      }
    }
  };

  const analyzeImage = async (base64Image: string) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Extrais les informations clés de cette facture :
        - Fournisseur (nom)
        - Date de la facture
        - Montant total TTC
        - Description des prestations
        Réponds uniquement au format JSON avec cette structure exacte, sans markdown :
        {"fournisseur": "", "date": "JJ/MM/AAAA", "montant": number, "description": ""}`;

      const result = await model.generateContent([
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        prompt
      ]);

      const responseText = result.response.text();
      // On nettoie au cas où il y a des balises ```json
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const extractedData = JSON.parse(cleanJson);
      
      // On retourne au dashboard en passant les paramètres extraits
      router.push({
        pathname: `/projects/${id}`,
        params: {
          scannedAmount: extractedData.montant,
          scannedDesc: extractedData.description,
          scannedProvider: extractedData.fournisseur
        }
      });
    } catch (error) {
      console.error('Gemini error:', error);
      Alert.alert('Erreur', "L'analyse de la facture a échoué. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <MaterialCommunityIcons name="camera" size={40} color="#1E3A5F" />
            )}
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  camera: { flex: 1 },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    marginBottom: 40,
    alignItems: 'flex-end',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
