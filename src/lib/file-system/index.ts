/**
 * File System Abstraction Layer - Entry Point
 *
 * Factory function that creates the appropriate file system adapter
 * based on the runtime environment (browser vs Electron).
 */

import type { FileSystemAdapter } from './types';
import { BrowserFileSystemAdapter } from './browser-adapter';
import { ElectronFileSystemAdapter } from './electron-adapter';

/**
 * Create a file system adapter for the current environment
 *
 * Priority order:
 * 1. Electron (if running in Electron environment)
 * 2. Browser (default for web)
 *
 * @returns FileSystemAdapter instance
 */
export function createFileSystemAdapter(): FileSystemAdapter {
  // Future: Check for Electron first
  // if (typeof window !== 'undefined' && (window as any).electron) {
  //   const electronAdapter = new ElectronFileSystemAdapter();
  //   if (electronAdapter.isSupported()) {
  //     return electronAdapter;
  //   }
  // }

  // Default to browser adapter
  return new BrowserFileSystemAdapter();
}

/**
 * Singleton instance for convenience
 * Created lazily on first access
 */
let _adapterInstance: FileSystemAdapter | null = null;

/**
 * Get the singleton file system adapter instance
 *
 * @returns FileSystemAdapter instance
 */
export function getFileSystemAdapter(): FileSystemAdapter {
  if (!_adapterInstance) {
    _adapterInstance = createFileSystemAdapter();
  }
  return _adapterInstance;
}

/**
 * Reset the singleton instance
 * Useful for testing or when switching environments
 */
export function resetFileSystemAdapter(): void {
  _adapterInstance = null;
}

// Re-export types for convenience
export type {
  FileSystemAdapter,
  FileHandle,
  StoredFileMetadata,
  SaveResult,
  AutoSaveConfig,
  SaveStatus,
  UseAutoSaveReturn,
} from './types';

// Re-export database utilities for direct access if needed
export {
  getAutoSaveConfig,
  saveAutoSaveConfig,
  getStorageQuota,
  requestPersistentStorage,
  isStoragePersisted,
} from './db';
