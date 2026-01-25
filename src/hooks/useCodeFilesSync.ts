"use client";

/**
 * useCodeFilesSync Hook
 *
 * Syncs code files between collaborators in real-time.
 * When a new file is added, it automatically appears for other users.
 * File deletions require confirmation from other users to protect annotations.
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useProjects } from "@/context/ProjectsContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Local CodeFile interface for syncing
interface CodeFile {
  id: string;
  name: string;
  language: string;
  content: string;
  originalContent?: string;
}

interface CodeFileRow {
  id: string;
  project_id: string;
  filename: string;
  language: string | null;
  content: string;
  original_content: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

interface PendingDeletion {
  id: string;
  file_id: string;
  project_id: string;
  requested_by: string | null;
  filename: string;
  created_at: string;
  expires_at: string;
}

interface UseCodeFilesSyncOptions {
  /** Called when a new file is added by another user */
  onFileAdded?: (file: CodeFile) => void;
  /** Called when a file is deleted by another user */
  onFileDeleted?: (fileId: string) => void;
  /** Called when a file deletion is requested */
  onDeletionRequested?: (deletion: PendingDeletion) => void;
  /** Called when a deletion is rejected (file restored) */
  onDeletionRejected?: (fileId: string) => void;
  /** Whether sync is enabled */
  enabled?: boolean;
}

// Convert DB row to local CodeFile format
function rowToCodeFile(row: CodeFileRow): CodeFile {
  return {
    id: row.id,
    name: row.filename,
    language: row.language || detectLanguage(row.filename),
    content: row.content,
    originalContent: row.original_content || row.content,
  };
}

// Detect language from filename
function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    rs: "rust",
    go: "go",
    rb: "ruby",
    php: "php",
    html: "html",
    css: "css",
    json: "json",
    xml: "xml",
    md: "markdown",
    sql: "sql",
    sh: "shell",
    bash: "shell",
  };
  return langMap[ext || ""] || "plaintext";
}

export function useCodeFilesSync({
  onFileAdded,
  onFileDeleted,
  onDeletionRequested,
  onDeletionRejected,
  enabled = true,
}: UseCodeFilesSyncOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const { currentProjectId } = useProjects();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const deletionChannelRef = useRef<RealtimeChannel | null>(null);
  const [pendingDeletions, setPendingDeletions] = useState<PendingDeletion[]>([]);
  const lastUpdateRef = useRef<number>(0);

  const supabase = isSupabaseConfigured() ? getSupabaseClient() : null;

  // Store callbacks in refs
  const onFileAddedRef = useRef(onFileAdded);
  const onFileDeletedRef = useRef(onFileDeleted);
  const onDeletionRequestedRef = useRef(onDeletionRequested);
  const onDeletionRejectedRef = useRef(onDeletionRejected);
  onFileAddedRef.current = onFileAdded;
  onFileDeletedRef.current = onFileDeleted;
  onDeletionRequestedRef.current = onDeletionRequested;
  onDeletionRejectedRef.current = onDeletionRejected;

  // Fetch all code files for current project
  const fetchCodeFiles = useCallback(async (): Promise<CodeFile[]> => {
    if (!supabase || !currentProjectId) return [];

    // Order by display_order to preserve user-defined ordering (falls back to created_at)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data, error } = await (supabase as any)
      .from("code_files")
      .select("*")
      .eq("project_id", currentProjectId)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    // Fallback: if display_order column doesn't exist yet, query without it
    if (error) {
      console.warn("Fetching code files with display_order failed, trying without:", error);
      const fallback = await (supabase as any)
        .from("code_files")
        .select("*")
        .eq("project_id", currentProjectId)
        .order("created_at", { ascending: true });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("Error fetching code files:", error);
      return [];
    }

    // Track updated_at timestamps for staleness detection
    for (const row of data || []) {
      if (row.updated_at) {
        fileTimestampsRef.current.set(row.id, row.updated_at);
      }
    }

    return (data || []).map(rowToCodeFile);
  }, [supabase, currentProjectId]);

  // Track last known updated_at for each file (to detect stale saves)
  const fileTimestampsRef = useRef<Map<string, string>>(new Map());

  // Save a code file to Supabase (with staleness check)
  const saveCodeFile = useCallback(
    async (file: CodeFile) => {
      if (!supabase || !currentProjectId) {
        return { error: new Error("Not connected to project"), skipped: false };
      }

      // Check if file exists and get its current updated_at
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from("code_files")
        .select("updated_at")
        .eq("id", file.id)
        .eq("project_id", currentProjectId)
        .single();

      if (existing) {
        const remoteUpdatedAt = existing.updated_at;
        const localUpdatedAt = fileTimestampsRef.current.get(file.id);

        // If remote is newer than our last fetch, skip save to avoid overwriting
        if (localUpdatedAt && remoteUpdatedAt > localUpdatedAt) {
          console.log("saveCodeFile: Skipping save - remote is newer", file.name, {
            remote: remoteUpdatedAt,
            local: localUpdatedAt,
          });
          return { error: null, skipped: true };
        }
      }

      lastUpdateRef.current = Date.now();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("code_files")
        .upsert(
          {
            id: file.id,
            project_id: currentProjectId,
            filename: file.name,
            language: file.language,
            content: file.content,
            original_content: file.originalContent || file.content,
            uploaded_by: user?.id || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select("updated_at")
        .single();

      if (error) {
        console.error("Error saving code file:", error);
        return { error: new Error(error.message), skipped: false };
      }

      // Update our timestamp tracking
      if (data?.updated_at) {
        fileTimestampsRef.current.set(file.id, data.updated_at);
      }

      return { error: null, skipped: false };
    },
    [supabase, currentProjectId, user?.id]
  );

  // Delete a code file from Supabase (immediate deletion, no confirmation)
  const deleteCodeFile = useCallback(
    async (fileId: string) => {
      if (!supabase || !currentProjectId) {
        console.error("deleteCodeFile: Not connected to project");
        return { error: new Error("Not connected to project") };
      }

      console.log("deleteCodeFile: Deleting file", fileId, "from project", currentProjectId);

      // Remove from known files and timestamps BEFORE delete to prevent polling from re-adding
      knownFilesRef.current.delete(fileId);
      fileTimestampsRef.current.delete(fileId);
      lastUpdateRef.current = Date.now();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error, count } = await (supabase as any)
        .from("code_files")
        .delete()
        .eq("id", fileId)
        .eq("project_id", currentProjectId);

      if (error) {
        console.error("deleteCodeFile: Database error:", error);
        return { error: new Error(error.message) };
      }

      console.log("deleteCodeFile: Successfully deleted, rows affected:", count);

      // Update timestamp again after delete completes
      lastUpdateRef.current = Date.now();

      return { error: null };
    },
    [supabase, currentProjectId]
  );

  // Request file deletion (creates pending deletion for other users to confirm/reject)
  const requestFileDeletion = useCallback(
    async (fileId: string, filename: string) => {
      if (!supabase || !currentProjectId) {
        return { error: new Error("Not connected to project") };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("pending_deletions")
        .insert({
          file_id: fileId,
          project_id: currentProjectId,
          requested_by: user?.id || null,
          filename,
        });

      if (error) {
        console.error("Error requesting deletion:", error);
        return { error: new Error(error.message) };
      }

      return { error: null };
    },
    [supabase, currentProjectId, user?.id]
  );

  // Confirm file deletion (actually deletes the file)
  const confirmDeletion = useCallback(
    async (deletionId: string, fileId: string) => {
      if (!supabase) {
        return { error: new Error("Supabase not configured") };
      }

      // Delete the pending deletion record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("pending_deletions")
        .delete()
        .eq("id", deletionId);

      // Delete the actual file (cascades to annotations)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("code_files")
        .delete()
        .eq("id", fileId);

      if (error) {
        console.error("Error confirming deletion:", error);
        return { error: new Error(error.message) };
      }

      setPendingDeletions((prev) => prev.filter((d) => d.id !== deletionId));
      return { error: null };
    },
    [supabase]
  );

  // Reject file deletion (cancels the request)
  const rejectDeletion = useCallback(
    async (deletionId: string, fileId: string) => {
      if (!supabase) {
        return { error: new Error("Supabase not configured") };
      }

      // Delete the pending deletion record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("pending_deletions")
        .delete()
        .eq("id", deletionId);

      if (error) {
        console.error("Error rejecting deletion:", error);
        return { error: new Error(error.message) };
      }

      setPendingDeletions((prev) => prev.filter((d) => d.id !== deletionId));
      onDeletionRejectedRef.current?.(fileId);
      return { error: null };
    },
    [supabase]
  );

  // Fetch pending deletions
  const fetchPendingDeletions = useCallback(async () => {
    if (!supabase || !currentProjectId) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("pending_deletions")
      .select("*")
      .eq("project_id", currentProjectId);

    if (error) {
      console.error("Error fetching pending deletions:", error);
      return [];
    }

    return data as PendingDeletion[];
  }, [supabase, currentProjectId]);

  // Track known files to detect new files, updates, and deletions
  const knownFilesRef = useRef<Map<string, { name: string; contentHash: string }>>(new Map());

  // Simple hash for change detection
  function hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(content.length, 1000); i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash |= 0;
    }
    return `${content.length}:${hash}`;
  }

  // Polling for code files (5 second interval)
  useEffect(() => {
    if (!supabase || !isAuthenticated || !currentProjectId || !enabled) {
      return;
    }

    let isMounted = true;

    // Initial fetch
    const initialFetch = async () => {
      const files = await fetchCodeFiles();
      if (isMounted) {
        files.forEach(f => {
          knownFilesRef.current.set(f.id, {
            name: f.name,
            contentHash: hashContent(f.content),
          });
        });
      }
    };
    initialFetch();

    // Initial fetch of pending deletions
    fetchPendingDeletions().then((deletions) => {
      if (isMounted) {
        // Filter out our own deletion requests
        const othersDeletions = deletions.filter((d) => d.requested_by !== user?.id);
        setPendingDeletions(othersDeletions);
      }
    });

    // Poll for file changes
    const pollForChanges = async () => {
      if (!isMounted) return;

      // Skip if we just made an update (to avoid processing our own changes)
      const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
      if (timeSinceLastUpdate < 3000) {
        console.log("useCodeFilesSync: Skipping poll, recent update", timeSinceLastUpdate, "ms ago");
        return;
      }

      const files = await fetchCodeFiles();
      const remoteIds = new Set(files.map(f => f.id));

      // Check for new files and updates
      for (const file of files) {
        const known = knownFilesRef.current.get(file.id);
        const contentHash = hashContent(file.content);

        if (!known) {
          // New file from collaborator
          console.log("useCodeFilesSync: New file from collaborator:", file.name, file.id);
          knownFilesRef.current.set(file.id, { name: file.name, contentHash });
          onFileAddedRef.current?.(file);
        } else if (known.name !== file.name || known.contentHash !== contentHash) {
          // File was updated (renamed or content changed)
          console.log("useCodeFilesSync: File updated:", file.name, file.id);
          knownFilesRef.current.set(file.id, { name: file.name, contentHash });
          onFileAddedRef.current?.(file); // Reuse onFileAdded for updates
        }
      }

      // Check for deleted files - but only if we got a non-empty result
      // (empty result when we had files is suspicious and likely indicates an error)
      const hadFiles = knownFilesRef.current.size > 0;
      const gotEmptyResult = files.length === 0;

      if (hadFiles && gotEmptyResult) {
        console.warn("useCodeFilesSync: Got empty result but had files - skipping deletion check (likely error)");
      } else {
        for (const [fileId] of knownFilesRef.current) {
          if (!remoteIds.has(fileId)) {
            console.log("useCodeFilesSync: File deleted by collaborator:", fileId);
            knownFilesRef.current.delete(fileId);
            fileTimestampsRef.current.delete(fileId);
            onFileDeletedRef.current?.(fileId);
          }
        }
      }
    };

    // Poll every 5 seconds for file changes
    const intervalId = setInterval(pollForChanges, 5000);

    // Resume sync immediately when tab becomes visible (fixes Safari suspension)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, triggering code files sync");
        pollForChanges();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [supabase, isAuthenticated, currentProjectId, enabled, user?.id, fetchCodeFiles, fetchPendingDeletions]);

  return {
    /** Fetch all code files for current project */
    fetchCodeFiles,
    /** Save a code file to Supabase */
    saveCodeFile,
    /** Delete a code file from Supabase */
    deleteCodeFile,
    /** Request file deletion (other users must confirm) */
    requestFileDeletion,
    /** Confirm a pending deletion */
    confirmDeletion,
    /** Reject a pending deletion */
    rejectDeletion,
    /** Pending file deletions that need confirmation */
    pendingDeletions,
    /** Whether sync is connected */
    isConnected: !!channelRef.current,
  };
}
