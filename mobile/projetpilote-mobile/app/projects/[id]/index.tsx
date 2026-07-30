import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, useTheme, FAB, Portal, Modal, TextInput, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { addOperationToQueue } from '../../../lib/storage';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProjectDashboard() {
  const { id, scannedAmount, scannedDesc } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [data, setData] = useState<any>(null);
  
  // Saisie rapide state
  const [visible, setVisible] = useState(false);
  const [taskCode, setTaskCode] = useState('');
  const [actualCost, setActualCost] = useState('');
  
  const showModal = () => setVisible(true);
  const hideModal = () => {
    setVisible(false);
    // Reset les paramètres de scan de l'URL si on ferme (optionnel)
  };

  useEffect(() => {
    if (scannedAmount) {
      setActualCost(String(scannedAmount));
      setTaskCode(String(scannedDesc || ''));
      setVisible(true);
    }
  }, [scannedAmount, scannedDesc]);

  useEffect(() => {
    fetchEVMData();
  }, [id]);

  const fetchEVMData = async () => {
    const { data: project } = await supabase.from('projects').select('*').eq('id', id).single();
    setData({
      bac: project?.budget_total || 0,
      eac: project?.budget_total ? project.budget_total * 1.1 : 0,
      vac: project?.budget_total ? - (project.budget_total * 0.1) : 0,
      cpi: 0.85,
      spi: 0.95
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const handleSaveOperation = async () => {
    if (!taskCode || !actualCost) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    const op = {
      project_id: id,
      task_id: taskCode,
      actual_cost: parseFloat(actualCost),
      status: 'decaisse',
      description: 'Saisie rapide offline',
      date_transaction: new Date().toISOString()
    };
    addOperationToQueue(op);
    Alert.alert('Succès', 'Opération sauvegardée en local ! Elle sera synchronisée au retour du réseau.');
    hideModal();
    setTaskCode('');
    setActualCost('');
  };

  const renderGauge = (value: number, title: string) => {
    const radius = 40;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value > 1 ? 1 : value) * circumference;
    const color = value >= 1 ? '#16A34A' : value >= 0.9 ? '#F59E0B' : '#DC2626';

    return (
      <View style={styles.gaugeContainer}>
        <Svg width="100" height="100" viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r={radius} stroke="#E2E8F0" strokeWidth={strokeWidth} fill="none" />
          <Circle 
            cx="50" cy="50" r={radius} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            fill="none" 
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          <SvgText x="50" y="55" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#0F172A">
            {value.toFixed(2)}
          </SvgText>
        </Svg>
        <Text style={styles.gaugeTitle}>{title}</Text>
      </View>
    );
  };

  if (!data) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cardsGrid}>
          <Card style={[styles.kpiCard, { borderLeftColor: '#3B82F6', borderLeftWidth: 4 }]}>
            <Card.Content>
              <Text variant="labelSmall" style={styles.kpiLabel}>BAC (Budget Initial)</Text>
              <Text variant="titleMedium" style={styles.kpiValue}>{formatCurrency(data.bac)}</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.kpiCard, { borderLeftColor: '#F59E0B', borderLeftWidth: 4 }]}>
            <Card.Content>
              <Text variant="labelSmall" style={styles.kpiLabel}>EAC (Budget Révisé)</Text>
              <Text variant="titleMedium" style={styles.kpiValue}>{formatCurrency(data.eac)}</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.kpiCard, { borderLeftColor: data.vac >= 0 ? '#16A34A' : '#DC2626', borderLeftWidth: 4 }]}>
            <Card.Content>
              <Text variant="labelSmall" style={styles.kpiLabel}>VAC (Écart à l'achèvement)</Text>
              <Text variant="titleMedium" style={[styles.kpiValue, { color: data.vac >= 0 ? '#16A34A' : '#DC2626' }]}>
                {formatCurrency(data.vac)}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.gaugesCard}>
          <Card.Content style={styles.gaugesRow}>
            {renderGauge(data.cpi, "CPI (Coûts)")}
            {renderGauge(data.spi, "SPI (Délais)")}
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#fff"
        onPress={showModal}
      />

      <Portal>
        <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={styles.modalContent}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text variant="titleLarge" style={styles.modalTitle}>Saisie rapide</Text>
            <Button 
              mode="text" 
              icon="camera" 
              onPress={() => {
                hideModal();
                router.push(`/projects/${id}/scan`);
              }}
            >
              Scanner OCR
            </Button>
          </View>

          <TextInput
            label="Code Tâche / Description"
            value={taskCode}
            onChangeText={setTaskCode}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Coût Réel (FCFA)"
            value={actualCost}
            onChangeText={setActualCost}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
          <Button mode="contained" onPress={handleSaveOperation} style={styles.modalButton}>
            Enregistrer (Hors-ligne)
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 16 },
  cardsGrid: { gap: 12, marginBottom: 24 },
  kpiCard: { backgroundColor: '#fff' },
  kpiLabel: { color: '#64748B', textTransform: 'uppercase', marginBottom: 4 },
  kpiValue: { fontWeight: 'bold', color: '#0F172A' },
  gaugesCard: { backgroundColor: '#fff' },
  gaugesRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 16 },
  gaugeContainer: { alignItems: 'center' },
  gaugeTitle: { marginTop: 8, fontWeight: 'bold', color: '#475569' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
  modalContent: { backgroundColor: 'white', padding: 24, margin: 16, borderRadius: 16 },
  modalTitle: { fontWeight: 'bold', color: '#0F172A', marginBottom: 0 },
  input: { marginBottom: 16, backgroundColor: '#fff' },
  modalButton: { marginTop: 8, borderRadius: 8 }
});
