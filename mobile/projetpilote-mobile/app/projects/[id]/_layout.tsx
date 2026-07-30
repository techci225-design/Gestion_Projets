import { Stack, useLocalSearchParams } from 'expo-router';

export default function ProjectLayout() {
  const { id } = useLocalSearchParams();
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#1E3A5F' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="index" options={{ title: 'Tableau de bord EVM' }} />
    </Stack>
  );
}
