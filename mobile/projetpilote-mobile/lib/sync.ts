import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { getOfflineOperations, clearOperationsQueue } from './storage';

export const syncOfflineOperations = async () => {
  const state = await NetInfo.fetch();
  
  if (state.isConnected && state.isInternetReachable) {
    const queue = getOfflineOperations();
    if (queue.length === 0) return 0;
    
    let syncedCount = 0;
    for (const op of queue) {
      // Nettoyer local_id avant insert
      const { local_id, ...operationData } = op;
      
      const { error } = await supabase
        .from('operations_journal')
        .insert(operationData);
        
      if (!error) {
        syncedCount++;
      } else {
        console.error('Erreur sync opération:', error);
      }
    }
    
    // Si on a tout synchronisé, on vide la queue (simplifié, idéalement on supprime individuellement)
    if (syncedCount === queue.length) {
      clearOperationsQueue();
    }
    return syncedCount;
  }
  return 0;
};
