import { Repo } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel";
import { WebRTCNetworkAdapter } from "@automerge/automerge-repo-network-webrtc";
import { useState, useEffect } from 'react';

const isDevelopment = (import.meta as any).env.DEV;
const DB_NAME = "alkima-mizu-automerge-data";

export function isValidDocumentUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  if (!url.startsWith('automerge:')) return false;
  if (url.length < 46) return false;
  return true;
}

export function resetRepository(): Promise<void> {
  console.warn("Performing full repository reset...");
  return new Promise<void>((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    deleteRequest.onsuccess = () => {
      console.log(`IndexedDB database "${DB_NAME}" deleted successfully.`);
      resolve();
    };
    deleteRequest.onerror = () => {
      console.error(`Error deleting database "${DB_NAME}".`);
      reject(deleteRequest.error);
    };
    deleteRequest.onblocked = () => {
      console.warn(`Deletion of database "${DB_NAME}" is blocked. Please close all other tabs of this application and try again.`);
      reject(new Error("Database deletion was blocked by another open tab."));
    };
  });
}

export interface SyncStatus {
  isOnline: boolean;
  connectedPeers: number;
  lastSync: string | null;
  syncErrors: string[];
}

class SyncMonitor {
  private static instance: SyncMonitor;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private currentStatus: SyncStatus = {
    isOnline: navigator.onLine,
    connectedPeers: 0,
    lastSync: null,
    syncErrors: [],
  };

  static getInstance(): SyncMonitor {
    if (!SyncMonitor.instance) {
      SyncMonitor.instance = new SyncMonitor();
    }
    return SyncMonitor.instance;
  }

  private constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('online', () => this.updateStatus({ isOnline: true }));
    window.addEventListener('offline', () => this.updateStatus({ isOnline: false }));
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => this.listeners.delete(listener);
  }

  updateStatus(update: Partial<SyncStatus>) {
    this.currentStatus = { ...this.currentStatus, ...update };
    this.listeners.forEach(listener => listener(this.currentStatus));
  }

  addSyncError(error: string) {
    const errors = [...this.currentStatus.syncErrors, error].slice(-5);
    this.updateStatus({ syncErrors: errors });
  }

  recordSync() {
    this.updateStatus({ lastSync: new Date().toISOString() });
  }
}

export const monitor = SyncMonitor.getInstance();

export const repo = new Repo({
  storage: new IndexedDBStorageAdapter(DB_NAME),
  network: [
    new BroadcastChannelNetworkAdapter(),
    new WebRTCNetworkAdapter({ signaling: ["wss://sync.automerge.org/"] })
  ],
  sharePolicy: async (peerId) => true,
  ...(isDevelopment && {
    onError: (event) => {
      console.error('[Automerge Repo Error]', event);
      const errorMessage = (event as any).message || 'Error de sincronización desconocido';
      monitor.addSyncError(errorMessage);
    },
  }),
});

// FIX: Use correct event names 'peer:candidate' and 'peer:disconnect' for peer status updates.
repo.on('peer:candidate', () => monitor.updateStatus({ connectedPeers: repo.peers.length }));
repo.on('peer:disconnect', () => monitor.updateStatus({ connectedPeers: repo.peers.length }));
repo.on('document', ({ handle }) => {
    if (!(handle as any).__syncListenerAttached) {
        handle.on('change', () => monitor.recordSync());
        (handle as any).__syncListenerAttached = true;
    }
});

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    connectedPeers: repo.peers.length,
    lastSync: null,
    syncErrors: [],
  });

  useEffect(() => {
    const monitorInstance = SyncMonitor.getInstance();
    const unsubscribe = monitorInstance.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
}