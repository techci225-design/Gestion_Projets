import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

const OPERATIONS_QUEUE_KEY = 'offline_operations_queue';

export const getOfflineOperations = (): any[] => {
  const json = storage.getString(OPERATIONS_QUEUE_KEY);
  return json ? JSON.parse(json) : [];
};

export const addOperationToQueue = (operation: any) => {
  const queue = getOfflineOperations();
  queue.push({ ...operation, local_id: Date.now().toString() });
  storage.set(OPERATIONS_QUEUE_KEY, JSON.stringify(queue));
};

export const clearOperationsQueue = () => {
  storage.delete(OPERATIONS_QUEUE_KEY);
};

export const removeOperationFromQueue = (localId: string) => {
  const queue = getOfflineOperations();
  const filtered = queue.filter(op => op.local_id !== localId);
  storage.set(OPERATIONS_QUEUE_KEY, JSON.stringify(filtered));
};
