/**
 * Offline Storage — IndexedDB-based queue for scans during network outage.
 *
 * When the scanner is offline, each scan is saved to IndexedDB.
 * When network is restored, a background sync pushes all pending scans to the server.
 *
 * Usage:
 *   import { offlineStorage } from '@/lib/offline-storage';
 *   await offlineStorage.enqueueScan({ shipmentId, wagonId, status, station });
 *   await offlineStorage.syncPending(); // called automatically by the sync listener
 */

const DB_NAME = 'cargotrans-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-scans';

export interface PendingScan {
  id?: number;
  shipmentId: string;
  wagonId?: string;
  status: string;        // e.g. 'LOADED', 'transit'
  station: string;
  operatorId?: string;
  timestamp: string;     // ISO string
  endpoint: string;      // full API path, e.g. '/api/shipments/123/transit'
  method: string;        // 'POST' | 'PATCH'
  body: Record<string, unknown>;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllPending(): Promise<PendingScan[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteRecord(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function enqueueScan(scan: Omit<PendingScan, 'id'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).add(scan);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function countPending(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Sync all pending scans to the server.
 * Respects ordering (FIFO) so statuses don't get mixed up.
 * Returns { synced, failed } counts.
 */
async function syncPending(token: string): Promise<{ synced: number; failed: number }> {
  const pending = await getAllPending();
  let synced = 0;
  let failed = 0;

  for (const scan of pending) {
    try {
      const res = await fetch(scan.endpoint, {
        method: scan.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(scan.body),
      });

      if (res.ok && scan.id !== undefined) {
        await deleteRecord(scan.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
      break; // Stop if network is unavailable again
    }
  }

  return { synced, failed };
}

/**
 * Register online/offline listeners.
 * Call once at app startup.
 */
function registerSyncListener(getToken: () => string | null, onSynced?: (count: number) => void): void {
  window.addEventListener('online', async () => {
    const token = getToken();
    if (!token) return;
    const count = await countPending();
    if (count === 0) return;
    const { synced } = await syncPending(token);
    if (synced > 0 && onSynced) onSynced(synced);
  });
}

export const offlineStorage = {
  enqueueScan,
  syncPending,
  countPending,
  getAllPending,
  registerSyncListener,
};
