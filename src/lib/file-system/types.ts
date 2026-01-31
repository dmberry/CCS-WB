/**
 * File System Abstraction Layer - Types
 *
 * Provides unified interface for file operations across:
 * - Browser (File System Access API + IndexedDB fallback)
 * - Electron (future implementation)
 */

import type { EntryMode } from '@/types';

/**
 * Platform-agnostic file handle
 * Wraps browser FileSystemFileHandle or Electron file paths
 */
export interface FileHandle {
  kind: 'file';
  name: string;
  // Browser: FileSystemFileHandle, Electron: file path string
  nativeHandle?: FileSystemFileHandle | string;
}

/**
 * Metadata for stored files
 * Persisted in IndexedDB alongside file handles
 */
export interface StoredFileMetadata {
  id: string;           // Session file ID (matches SessionContext)
  name: string;         // Filename with extension
  handleId: string;     // IndexedDB key for file handle
  lastSaved: string;    // ISO timestamp
  isDirty: boolean;     // Has unsaved changes
  size: number;         // File size in bytes
  mode: EntryMode;      // critique | archaeology | interpret | create
}

/**
 * Auto-save configuration
 */
export interface AutoSaveConfig {
  enabled: boolean;
  debounceMs: number;   // Default: 1000ms (matches SessionContext)
  showToasts: boolean;  // Show save success/error notifications
}

/**
 * Save operation result
 */
export interface SaveResult {
  success: boolean;
  error?: string;
  timestamp?: string;   // ISO timestamp of successful save
  size?: number;        // Size of saved content in bytes
}

/**
 * File system adapter interface
 * Implemented by BrowserFileSystemAdapter and ElectronFileSystemAdapter
 */
export interface FileSystemAdapter {
  /**
   * Check if this adapter is supported in the current environment
   */
  isSupported(): boolean;

  /**
   * Request a writable file handle from the user
   * Opens native file picker dialog
   *
   * @param suggestedName - Suggested filename (e.g., "my-project.ccs")
   * @returns FileHandle if user grants permission, null if cancelled
   */
  requestWriteHandle(suggestedName: string): Promise<FileHandle | null>;

  /**
   * Save content to an existing file handle
   *
   * @param handle - File handle to write to
   * @param content - Content to save
   * @returns Save operation result
   */
  saveToHandle(handle: FileHandle, content: string): Promise<SaveResult>;

  /**
   * Store a file handle for future use
   * Browser: Stores FileSystemFileHandle in IndexedDB
   * Electron: Stores file path
   *
   * @param fileId - Session file ID
   * @param handle - File handle to store
   * @returns Handle ID for retrieval
   */
  storeHandle(fileId: string, handle: FileHandle): Promise<string>;

  /**
   * Retrieve a previously stored file handle
   *
   * @param handleId - Handle ID from storeHandle()
   * @returns FileHandle if found and still valid, null otherwise
   */
  retrieveHandle(handleId: string): Promise<FileHandle | null>;

  /**
   * Remove a stored file handle
   *
   * @param handleId - Handle ID to remove
   */
  removeHandle(handleId: string): Promise<void>;

  /**
   * Get metadata for a stored file
   *
   * @param fileId - Session file ID
   * @returns Metadata if found, null otherwise
   */
  getMetadata(fileId: string): Promise<StoredFileMetadata | null>;

  /**
   * Update metadata for a stored file
   *
   * @param fileId - Session file ID
   * @param updates - Partial metadata to update
   */
  updateMetadata(fileId: string, updates: Partial<StoredFileMetadata>): Promise<void>;

  /**
   * List all stored files for a given mode
   *
   * @param mode - Entry mode to filter by
   * @returns Array of file metadata
   */
  listFiles(mode: EntryMode): Promise<StoredFileMetadata[]>;

  /**
   * Check if file handle still has write permission
   * Browser: Queries permission state
   * Electron: Checks file exists and is writable
   *
   * @param handle - File handle to check
   * @returns true if writable, false otherwise
   */
  hasWritePermission(handle: FileHandle): Promise<boolean>;

  /**
   * Request write permission for a file handle
   * Browser: Triggers permission prompt
   * Electron: Always returns true (uses fs permissions)
   *
   * @param handle - File handle to request permission for
   * @returns true if permission granted, false otherwise
   */
  requestWritePermission(handle: FileHandle): Promise<boolean>;
}

/**
 * Save status for UI display
 */
export type SaveStatus =
  | 'idle'      // No pending saves
  | 'saving'    // Save in progress
  | 'saved'     // Recently saved successfully
  | 'error';    // Save failed

/**
 * Auto-save hook return value
 */
export interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  lastSaved: string | null;     // ISO timestamp or null
  isDirty: boolean;              // Has unsaved changes
  save: () => Promise<void>;     // Manual save trigger
  enableAutoSave: (enabled: boolean) => void;
  requestNewFile: () => Promise<void>;  // Request file handle for new file
}
