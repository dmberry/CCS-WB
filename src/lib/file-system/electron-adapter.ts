/**
 * Electron File System Adapter (Stub)
 *
 * Future implementation will use Electron's fs and dialog APIs
 * for native file system access on desktop.
 *
 * Hooks are in place for when Electron support is added.
 */

import type {
  FileSystemAdapter,
  FileHandle,
  StoredFileMetadata,
  SaveResult,
} from './types';
import type { EntryMode } from '@/types';

/**
 * Check if running in Electron environment
 */
function isElectronEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).electron !== 'undefined'
  );
}

/**
 * Electron implementation of FileSystemAdapter (stub)
 *
 * Future implementation will use:
 * - electron.dialog.showSaveDialog() for file picker
 * - electron.fs.writeFile() for saving
 * - electron.fs.readFile() for loading
 * - Store file paths instead of FileSystemFileHandle
 */
export class ElectronFileSystemAdapter implements FileSystemAdapter {
  /**
   * Check if Electron is available
   */
  isSupported(): boolean {
    return isElectronEnvironment();
  }

  /**
   * Request a writable file handle (Electron version)
   * Future: Use electron.dialog.showSaveDialog()
   */
  async requestWriteHandle(_suggestedName: string): Promise<FileHandle | null> {
    throw new Error('Electron adapter not yet implemented. Use browser version.');
  }

  /**
   * Save content to file (Electron version)
   * Future: Use electron.fs.writeFile()
   */
  async saveToHandle(_handle: FileHandle, _content: string): Promise<SaveResult> {
    throw new Error('Electron adapter not yet implemented. Use browser version.');
  }

  /**
   * Store file path for future use (Electron version)
   * Future: Store in electron-store or similar
   */
  async storeHandle(_fileId: string, _handle: FileHandle): Promise<string> {
    throw new Error('Electron adapter not yet implemented. Use browser version.');
  }

  /**
   * Retrieve file path (Electron version)
   * Future: Retrieve from electron-store
   */
  async retrieveHandle(_handleId: string): Promise<FileHandle | null> {
    throw new Error('Electron adapter not yet implemented. Use browser version.');
  }

  /**
   * Remove stored file path (Electron version)
   */
  async removeHandle(_handleId: string): Promise<void> {
    throw new Error('Electron adapter not yet implemented. Use browser version.');
  }

  /**
   * Get file metadata (Electron version)
   * Future: Use electron-store for metadata
   */
  async getMetadata(_fileId: string): Promise<StoredFileMetadata | null> {
    throw new Error('Electron adapter not yet implemented. Use browser version.');
  }

  /**
   * Update file metadata (Electron version)
   */
  async updateMetadata(_fileId: string, _updates: Partial<StoredFileMetadata>): Promise<void> {
    throw new Error('Electron adapter not yet implemented. Use browser version.');
  }

  /**
   * List files for mode (Electron version)
   */
  async listFiles(_mode: EntryMode): Promise<StoredFileMetadata[]> {
    throw new Error('Electron adapter not yet implemented. Use browser version.');
  }

  /**
   * Check write permission (Electron version)
   * Future: Use electron.fs.access()
   */
  async hasWritePermission(_handle: FileHandle): Promise<boolean> {
    throw new Error('Electron adapter not yet implemented. Use browser version.');
  }

  /**
   * Request write permission (Electron version)
   * Note: Electron uses OS file permissions, no explicit request needed
   */
  async requestWritePermission(_handle: FileHandle): Promise<boolean> {
    throw new Error('Electron adapter not yet implemented. Use browser version.');
  }
}

/**
 * Future Electron preload script API shape
 *
 * Add this to your Electron preload script when implementing:
 *
 * ```typescript
 * import { contextBridge, ipcRenderer } from 'electron';
 *
 * contextBridge.exposeInMainWorld('electron', {
 *   dialog: {
 *     showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
 *     showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
 *   },
 *   fs: {
 *     writeFile: (path, data) => ipcRenderer.invoke('fs:writeFile', path, data),
 *     readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
 *     access: (path) => ipcRenderer.invoke('fs:access', path),
 *   },
 *   store: {
 *     get: (key) => ipcRenderer.invoke('store:get', key),
 *     set: (key, value) => ipcRenderer.invoke('store:set', key, value),
 *     delete: (key) => ipcRenderer.invoke('store:delete', key),
 *   },
 * });
 * ```
 *
 * Main process handlers:
 *
 * ```typescript
 * import { ipcMain, dialog } from 'electron';
 * import * as fs from 'fs/promises';
 * import Store from 'electron-store';
 *
 * const store = new Store();
 *
 * ipcMain.handle('dialog:showSaveDialog', async (_, options) => {
 *   return dialog.showSaveDialog(options);
 * });
 *
 * ipcMain.handle('fs:writeFile', async (_, path, data) => {
 *   return fs.writeFile(path, data, 'utf-8');
 * });
 *
 * ipcMain.handle('fs:readFile', async (_, path) => {
 *   return fs.readFile(path, 'utf-8');
 * });
 *
 * ipcMain.handle('store:get', async (_, key) => {
 *   return store.get(key);
 * });
 *
 * ipcMain.handle('store:set', async (_, key, value) => {
 *   store.set(key, value);
 * });
 * ```
 */
