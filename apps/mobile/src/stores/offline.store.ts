import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { bucketApi } from '../services/api/bucket';
import type { CreateBucketForm, UpdateBucketForm } from '@bucketlist/shared';

type MutationType = 'CREATE_BUCKET' | 'UPDATE_BUCKET' | 'DELETE_BUCKET';

interface QueuedMutation {
  id: string;
  type: MutationType;
  payload: any;
  bucketId?: string; // For updates or deletes
  timestamp: number;
}

interface OfflineState {
  queue: QueuedMutation[];
  isOnline: boolean;
  isProcessing: boolean;
  addMutation: (mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) => void;
  removeMutation: (id: string) => void;
  setOnline: (status: boolean) => void;
  processQueue: () => Promise<void>;
}

const isServer = typeof window === 'undefined';
const dummyStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      queue: [],
      isOnline: true,
      isProcessing: false,
      
      addMutation: (mutation) => {
        set((state) => ({
          queue: [
            ...state.queue,
            {
              ...mutation,
              id: Math.random().toString(36).substring(7),
              timestamp: Date.now(),
            },
          ],
        }));
        
        // Try to process immediately if online
        if (get().isOnline && !get().isProcessing) {
          void get().processQueue();
        }
      },

      removeMutation: (id) => {
        set((state) => ({
          queue: state.queue.filter((m) => m.id !== id),
        }));
      },

      setOnline: (status) => {
        const wasOffline = !get().isOnline;
        set({ isOnline: status });
        
        // When coming back online, process the queue
        if (status && wasOffline && get().queue.length > 0 && !get().isProcessing) {
          void get().processQueue();
        }
      },

      processQueue: async () => {
        const { queue, isOnline, removeMutation } = get();
        
        if (!isOnline || queue.length === 0) return;
        
        set({ isProcessing: true });
        
        // Sort by timestamp to preserve order of operations
        const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);
        
        for (const mutation of sortedQueue) {
          try {
            switch (mutation.type) {
              case 'CREATE_BUCKET':
                await bucketApi.createBucket(mutation.payload as CreateBucketForm);
                break;
              case 'UPDATE_BUCKET':
                if (mutation.bucketId) {
                  await bucketApi.updateBucket(mutation.bucketId, mutation.payload as UpdateBucketForm);
                }
                break;
              case 'DELETE_BUCKET':
                if (mutation.bucketId) {
                  await bucketApi.deleteBucket(mutation.bucketId);
                }
                break;
            }
            // Remove from queue on success
            removeMutation(mutation.id);
          } catch (error) {
            console.error(`Failed to process queued mutation ${mutation.type}:`, error);
            // If it fails, we keep it in the queue for later, but stop processing 
            // the rest of the queue to maintain order (unless it's an unrecoverable error like 400).
            // For a robust app, we'd check error codes here.
            break; 
          }
        }
        
        set({ isProcessing: false });
      },
    }),
    {
      name: 'bucketlist-offline-queue',
      storage: createJSONStorage(() => isServer ? dummyStorage as any : AsyncStorage),
    }
  )
);

// Subscribe to network state changes globally
if (!isServer) {
  NetInfo.addEventListener(state => {
    useOfflineStore.getState().setOnline(!!state.isConnected && !!state.isInternetReachable);
  });
}
