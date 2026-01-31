/**
 * IndexedDB Schema and Operations
 *
 * Stores file handles, metadata, and auto-save configuration.
 * File System Access API handles are stored here because they cannot
 * be serialized to localStorage.
 */

import type { StoredFileMetadata, AutoSaveConfig } from './types';

const DB_NAME = 'ccs-wb-filesystem';
const DB_VERSION = 1;

// Object store names
const STORES = {
  FILE_HANDLES: 'fileHandles',
  FILE_METADATA: 'fileMetadata',
  AUTO_SAVE_CONFIG: 'autoSaveConfig',
} as const;

/**
 * Initialize IndexedDB schema
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // File handles store (handleId -> FileSystemFileHandle)
      if (!db.objectStoreNames.contains(STORES.FILE_HANDLES)) {
        db.createObjectStore(STORES.FILE_HANDLES);
      }

      // File metadata store (fileId -> StoredFileMetadata)
      if (!db.objectStoreNames.contains(STORES.FILE_METADATA)) {
        const metadataStore = db.createObjectStore(STORES.FILE_METADATA, { keyPath: 'id' });
        metadataStore.createIndex('mode', 'mode', { unique: false });
        metadataStore.createIndex('handleId', 'handleId', { unique: true });
      }

      // Auto-save config store (key -> config)
      if (!db.objectStoreNames.contains(STORES.AUTO_SAVE_CONFIG)) {
        db.createObjectStore(STORES.AUTO_SAVE_CONFIG);
      }
    };
  });
}

/**
 * Get database connection
 */
async function getDB(): Promise<IDBDatabase> {
  return initDB();
}

/**
 * Generic get operation
 */
async function get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic put operation
 */
async function put<T>(storeName: string, value: T, key?: IDBValidKey): Promise<IDBValidKey> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = key !== undefined ? store.put(value, key) : store.put(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic delete operation
 */
async function remove(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all values from a store
 */
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all values from an index
 */
async function getAllFromIndex<T>(
  storeName: string,
  indexName: string,
  query: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(query);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// File Handle Operations
// ============================================================================

/**
 * Store a file handle
 * @returns handleId for retrieval
 */
export async function storeFileHandle(handle: FileSystemFileHandle): Promise<string> {
  const handleId = `handle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await put(STORES.FILE_HANDLES, handle, handleId);
  return handleId;
}

/**
 * Retrieve a file handle by ID
 */
export async function getFileHandle(handleId: string): Promise<FileSystemFileHandle | null> {
  return get<FileSystemFileHandle>(STORES.FILE_HANDLES, handleId);
}

/**
 * Remove a file handle
 */
export async function removeFileHandle(handleId: string): Promise<void> {
  return remove(STORES.FILE_HANDLES, handleId);
}

// ============================================================================
// File Metadata Operations
// ============================================================================

/**
 * Store file metadata
 */
export async function storeFileMetadata(metadata: StoredFileMetadata): Promise<void> {
  await put(STORES.FILE_METADATA, metadata);
}

/**
 * Get file metadata by file ID
 */
export async function getFileMetadata(fileId: string): Promise<StoredFileMetadata | null> {
  return get<StoredFileMetadata>(STORES.FILE_METADATA, fileId);
}

/**
 * Get file metadata by handle ID
 */
export async function getFileMetadataByHandleId(handleId: string): Promise<StoredFileMetadata | null> {
  const results = await getAllFromIndex<StoredFileMetadata>(
    STORES.FILE_METADATA,
    'handleId',
    handleId
  );
  return results[0] ?? null;
}

/**
 * Update file metadata
 */
export async function updateFileMetadata(
  fileId: string,
  updates: Partial<StoredFileMetadata>
): Promise<void> {
  const existing = await getFileMetadata(fileId);
  if (!existing) {
    throw new Error(`File metadata not found for ID: ${fileId}`);
  }
  await storeFileMetadata({ ...existing, ...updates });
}

/**
 * Remove file metadata
 */
export async function removeFileMetadata(fileId: string): Promise<void> {
  return remove(STORES.FILE_METADATA, fileId);
}

/**
 * Get all file metadata for a given mode
 */
export async function getFileMetadataByMode(mode: string): Promise<StoredFileMetadata[]> {
  return getAllFromIndex<StoredFileMetadata>(STORES.FILE_METADATA, 'mode', mode);
}

/**
 * Get all file metadata
 */
export async function getAllFileMetadata(): Promise<StoredFileMetadata[]> {
  return getAll<StoredFileMetadata>(STORES.FILE_METADATA);
}

// ============================================================================
// Auto-Save Config Operations
// ============================================================================

const AUTO_SAVE_CONFIG_KEY = 'global';

/**
 * Get auto-save configuration
 */
export async function getAutoSaveConfig(): Promise<AutoSaveConfig> {
  const config = await get<AutoSaveConfig>(STORES.AUTO_SAVE_CONFIG, AUTO_SAVE_CONFIG_KEY);
  return config ?? {
    enabled: true,
    debounceMs: 1000,
    showToasts: true,
  };
}

/**
 * Save auto-save configuration
 */
export async function saveAutoSaveConfig(config: AutoSaveConfig): Promise<void> {
  await put(STORES.AUTO_SAVE_CONFIG, config, AUTO_SAVE_CONFIG_KEY);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all data from the database
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction(
    [STORES.FILE_HANDLES, STORES.FILE_METADATA, STORES.AUTO_SAVE_CONFIG],
    'readwrite'
  );

  transaction.objectStore(STORES.FILE_HANDLES).clear();
  transaction.objectStore(STORES.FILE_METADATA).clear();
  transaction.objectStore(STORES.AUTO_SAVE_CONFIG).clear();

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Delete the entire database
 */
export async function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Get storage quota information
 */
export async function getStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> {
  if (!navigator.storage?.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;

    return { usage, quota, percentage };
  } catch {
    return null;
  }
}

/**
 * Request persistent storage
 * Prevents browser from evicting data when storage is low
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persist();
    return isPersisted;
  } catch {
    return false;
  }
}

/**
 * Check if storage is persisted
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (!navigator.storage?.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}
