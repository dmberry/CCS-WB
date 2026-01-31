/**
 * useAutoSave Hook
 *
 * Provides auto-save functionality with debouncing and status tracking.
 * Integrates with file system adapter for native file handling.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { UseAutoSaveReturn, SaveStatus, FileHandle } from '@/lib/file-system';
import { getFileSystemAdapter } from '@/lib/file-system';

interface UseAutoSaveOptions {
  /**
   * File ID from session
   */
  fileId: string;

  /**
   * Current file content to save
   */
  content: string;

  /**
   * File handle if one has been selected
   */
  fileHandle?: FileHandle | null;

  /**
   * Callback to update file handle when new one is created
   */
  onHandleChange?: (handle: FileHandle) => void;

  /**
   * Auto-save enabled
   */
  enabled?: boolean;

  /**
   * Debounce delay in milliseconds (default: 1000ms)
   */
  debounceMs?: number;

  /**
   * Show toast notifications on save
   */
  showToasts?: boolean;

  /**
   * Callback when save completes successfully
   */
  onSaveSuccess?: (timestamp: string) => void;

  /**
   * Callback when save fails
   */
  onSaveError?: (error: string) => void;
}

/**
 * Auto-save hook with debouncing and file system integration
 */
export function useAutoSave(options: UseAutoSaveOptions): UseAutoSaveReturn {
  const {
    fileId,
    content,
    fileHandle,
    onHandleChange,
    enabled = true,
    debounceMs = 1000,
    showToasts = true,
    onSaveSuccess,
    onSaveError,
  } = options;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(enabled);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>(content);
  const adapterRef = useRef(getFileSystemAdapter());

  /**
   * Perform the actual save operation
   */
  const performSave = useCallback(async () => {
    if (!fileHandle) {
      // No file handle yet - can't auto-save
      // User needs to explicitly request a new file first
      return;
    }

    try {
      setSaveStatus('saving');

      const result = await adapterRef.current.saveToHandle(fileHandle, content);

      if (result.success) {
        const timestamp = result.timestamp!;
        setLastSaved(timestamp);
        setIsDirty(false);
        setSaveStatus('saved');

        // Update metadata
        await adapterRef.current.updateMetadata(fileId, {
          lastSaved: timestamp,
          isDirty: false,
          size: result.size ?? new Blob([content]).size,
        });

        if (onSaveSuccess) {
          onSaveSuccess(timestamp);
        }

        // Reset to idle after brief "saved" state
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } else {
        setSaveStatus('error');
        if (onSaveError) {
          onSaveError(result.error ?? 'Unknown error');
        }
      }
    } catch (error) {
      setSaveStatus('error');
      if (onSaveError) {
        onSaveError((error as Error).message);
      }
    }
  }, [fileHandle, content, fileId, onSaveSuccess, onSaveError]);

  /**
   * Trigger save with debouncing
   */
  const debouncedSave = useCallback(() => {
    if (!autoSaveEnabled || !fileHandle) {
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);
  }, [autoSaveEnabled, fileHandle, debounceMs, performSave]);

  /**
   * Manual save (no debounce)
   */
  const save = useCallback(async () => {
    // Clear debounce timer if active
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    await performSave();
  }, [performSave]);

  /**
   * Request new file handle for first save
   */
  const requestNewFile = useCallback(async () => {
    try {
      const suggestedName = `project-${fileId}.ccs`;
      const handle = await adapterRef.current.requestWriteHandle(suggestedName);

      if (handle) {
        // Store the handle
        const handleId = await adapterRef.current.storeHandle(fileId, handle);

        // Create metadata
        await adapterRef.current.updateMetadata(fileId, {
          name: handle.name,
          handleId,
          lastSaved: new Date().toISOString(),
          isDirty: false,
          size: new Blob([content]).size,
        });

        // Notify parent component
        if (onHandleChange) {
          onHandleChange(handle);
        }

        // Perform initial save
        await performSave();
      }
    } catch (error) {
      console.error('Failed to request file handle:', error);
      if (onSaveError) {
        onSaveError((error as Error).message);
      }
    }
  }, [fileId, content, onHandleChange, onSaveError, performSave]);

  /**
   * Enable/disable auto-save
   */
  const enableAutoSave = useCallback((enabled: boolean) => {
    setAutoSaveEnabled(enabled);
  }, []);

  /**
   * Track content changes
   */
  useEffect(() => {
    if (content !== lastContentRef.current) {
      lastContentRef.current = content;
      setIsDirty(true);
      debouncedSave();
    }
  }, [content, debouncedSave]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    lastSaved,
    isDirty,
    save,
    enableAutoSave,
    requestNewFile,
  };
}
