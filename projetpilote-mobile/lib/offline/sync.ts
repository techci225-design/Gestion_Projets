import { getDb } from './db'
import { supabase } from '../supabase'

export async function syncPendingMutations() {
  const db = await getDb()
  
  try {
    const mutations: any[] = await db.getAllAsync('SELECT * FROM pending_mutations ORDER BY timestamp ASC')
    
    if (mutations.length === 0) return

    for (const mutation of mutations) {
      try {
        const payload = JSON.parse(mutation.data)
        
        if (mutation.operation_type === 'INSERT') {
          await supabase.from(mutation.table_name).insert(payload)
        } else if (mutation.operation_type === 'UPDATE') {
          await supabase.from(mutation.table_name).update(payload).eq('id', payload.id)
        } else if (mutation.operation_type === 'DELETE') {
          await supabase.from(mutation.table_name).delete().eq('id', payload.id)
        }
        
        // Remove from pending once successful
        await db.runAsync('DELETE FROM pending_mutations WHERE id = ?', [mutation.id])
      } catch (err) {
        console.error('Erreur lors de la synchronisation de la mutation:', mutation.id, err)
        // Optionally break or continue based on error policy
      }
    }
  } catch (err) {
    console.error('Erreur globale de synchronisation:', err)
  }
}
