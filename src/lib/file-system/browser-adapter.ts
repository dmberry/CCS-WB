/**
 * Browser File System Adapter
 *
 * Implements FileSystemAdapter for browser environments.
 * Uses File System Access API when available (Chrome/Edge/Safari 15.2+),
 * falls back to IndexedDB for other browsers (Firefox).
 */

import type {
  FileSystemAdapter,
  FileHandle,
  StoredFileMetadata,
  SaveResult,
} from './types';
import type { EntryMode } from '@/types';
import {
  storeFileHandle,
  getFileHandle,
  removeFileHandle,
  storeFileMetadata,
  getFileMetadata,
  updateFileMetadata,
  removeFileMetadata,
  getFileMetadataByMode,
  isIndexedDBAvailable,
} from './db';

/**
 * Check if File System Access API is supported
 */
function isFileSystemAccessAPISupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showSaveFilePicker' in window &&
    'FileSystemFileHandle' in window
  );
}

/**
 * Browser implementation of FileSystemAdapter
 */
export class BrowserFileSystemAdapter implements FileSystemAdapter {
  private readonly useFSAA: boolean;

  constructor() {
    this.useFSAA = isFileSystemAccessAPISupported();
  }

  /**
   * Check if this adapter is supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && isIndexedDBAvailable();
  }

  /**
   * Request a writable file handle from the user
   * Opens native file picker dialog
   */
  async requestWriteHandle(suggestedName: string): Promise<FileHandle | null> {
    if (!this.useFSAA) {
      // Fallback browsers don't need handles for new files
      // We'll just create metadata and store content in localStorage
      return {
        kind: 'file',
        name: suggestedName,
      };
    }

    try {
      // File System Access API - request native file handle
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'CCS Workbench Project',
            accept: { 'application/json': ['.ccs'] },
          },
        ],
      });

      return {
        kind: 'file',
        name: handle.name,
        nativeHandle: handle,
      };
    } catch (error) {
      // User cancelled or error occurred
      if ((error as Error).name === 'AbortError') {
        return null; // User cancelled
      }
      throw error;
    }
  }

  /**
   * Save content to an existing file handle
   */
  async saveToHandle(handle: FileHandle, content: string): Promise<SaveResult> {
    try {
      if (this.useFSAA && handle.nativeHandle && typeof handle.nativeHandle !== 'string') {
        // File System Access API - write to native file
        const writable = await (handle.nativeHandle as FileSystemFileHandle).createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        // Fallback - content is already saved to localStorage by SessionContext
        // This is just a passthrough for consistency
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
        size: new Blob([content]).size,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Store a file handle for future use
   */
  async storeHandle(fileId: string, handle: FileHandle): Promise<string> {
    if (this.useFSAA && handle.nativeHandle && typeof handle.nativeHandle !== 'string') {
      // File System Access API - store native handle in IndexedDB
      const handleId = await storeFileHandle(handle.nativeHandle as FileSystemFileHandle);
      return handleId;
    } else {
      // Fallback - generate a handle ID for metadata tracking
      return `fallback-${fileId}`;
    }
  }

  /**
   * Retrieve a previously stored file handle
   */
  async retrieveHandle(handleId: string): Promise<FileHandle | null> {
    if (handleId.startsWith('fallback-')) {
      // Fallback - no real handle to retrieve
      return null;
    }

    if (!this.useFSAA) {
      return null;
    }

    try {
      const nativeHandle = await getFileHandle(handleId);
      if (!nativeHandle) {
        return null;
      }

      return {
        kind: 'file',
        name: nativeHandle.name,
        nativeHandle,
      };
    } catch {
      return null;
    }
  }

  /**
   * Remove a stored file handle
   */
  async removeHandle(handleId: string): Promise<void> {
    if (handleId.startsWith('fallback-')) {
      return; // Nothing to remove
    }

    await removeFileHandle(handleId);
  }

  /**
   * Get metadata for a stored file
   */
  async getMetadata(fileId: string): Promise<StoredFileMetadata | null> {
    return getFileMetadata(fileId);
  }

  /**
   * Update metadata for a stored file
   */
  async updateMetadata(fileId: string, updates: Partial<StoredFileMetadata>): Promise<void> {
    const metadata = await getFileMetadata(fileId);
    if (metadata) {
      await updateFileMetadata(fileId, updates);
    } else {
      // Create new metadata if it doesn't exist
      const newMetadata: StoredFileMetadata = {
        id: fileId,
        name: updates.name ?? 'untitled.ccs',
        handleId: updates.handleId ?? `fallback-${fileId}`,
        lastSaved: updates.lastSaved ?? new Date().toISOString(),
        isDirty: updates.isDirty ?? false,
        size: updates.size ?? 0,
        mode: updates.mode ?? 'critique',
      };
      await storeFileMetadata(newMetadata);
    }
  }

  /**
   * List all stored files for a given mode
   */
  async listFiles(mode: EntryMode): Promise<StoredFileMetadata[]> {
    return getFileMetadataByMode(mode);
  }

  /**
   * Check if file handle still has write permission
   */
  async hasWritePermission(handle: FileHandle): Promise<boolean> {
    if (!this.useFSAA || !handle.nativeHandle || typeof handle.nativeHandle === 'string') {
      return true; // Fallback always has "permission"
    }

    try {
      const nativeHandle = handle.nativeHandle as FileSystemFileHandle;
      const permission = await nativeHandle.queryPermission({ mode: 'readwrite' });
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Request write permission for a file handle
   */
  async requestWritePermission(handle: FileHandle): Promise<boolean> {
    if (!this.useFSAA || !handle.nativeHandle || typeof handle.nativeHandle === 'string') {
      return true; // Fallback always has "permission"
    }

    try {
      const nativeHandle = handle.nativeHandle as FileSystemFileHandle;
      const permission = await nativeHandle.requestPermission({ mode: 'readwrite' });
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Clean up orphaned handles
   * Removes handles that no longer have corresponding metadata
   */
  async cleanupOrphanedHandles(): Promise<void> {
    // This would require getAllFileMetadata and comparing with stored handles
    // Implementation deferred to avoid complexity in initial version
  }
}
