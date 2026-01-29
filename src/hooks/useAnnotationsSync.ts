"use client";

/**
 * useAnnotationsSync Hook
 *
 * Syncs annotations between local session state and Supabase for real-time collaboration.
 * Uses a hybrid approach: polling (5s interval) as reliable baseline, with Realtime
 * subscriptions as an accelerator for instant updates when available.
 */

import { useEffect, useCallback, useRef } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useProjects } from "@/context/ProjectsContext";
import type { LineAnnotation } from "@/types/session";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface AnnotationRow {
  id: string;
  file_id: string;
  project_id: string;
  user_id: string | null;
  added_by_initials: string | null;
  line_number: number;
  end_line_number: number | null;
  line_content: string | null;
  type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface UseAnnotationsSyncOptions {
  /** Local annotations from session */
  localAnnotations: LineAnnotation[];
  /** Callback to update local annotations when remote changes arrive */
  onRemoteChange: (annotations: LineAnnotation[]) => void;
  /** Map of local codeFileId to Supabase file_id (if synced) */
  fileIdMap: Record<string, string>;
  /** Whether sync is enabled */
  enabled?: boolean;
}

/**
 * Convert Supabase annotation row to local LineAnnotation format
 */
function rowToAnnotation(row: AnnotationRow, codeFileId: string): LineAnnotation {
  return {
    id: row.id,
    codeFileId,
    lineNumber: row.line_number,
    endLineNumber: row.end_line_number ?? undefined,
    lineContent: row.line_content ?? "",
    type: row.type as LineAnnotation["type"],
    content: row.content,
    createdAt: row.created_at,
    addedBy: row.added_by_initials ?? undefined,
  };
}

/**
 * Convert local LineAnnotation to Supabase insert format
 */
function annotationToRow(
  annotation: LineAnnotation,
  fileId: string,
  projectId: string,
  userId: string | null
): Omit<AnnotationRow, "created_at" | "updated_at"> {
  return {
    id: annotation.id,
    file_id: fileId,
    project_id: projectId,
    user_id: userId,
    added_by_initials: annotation.addedBy || null,
    line_number: annotation.lineNumber,
    end_line_number: annotation.endLineNumber ?? null,
    line_content: annotation.lineContent || null,
    type: annotation.type,
    content: annotation.content,
  };
}

export function useAnnotationsSync({
  localAnnotations,
  onRemoteChange,
  fileIdMap,
  enabled = true,
}: UseAnnotationsSyncOptions) {
  const { user, isAuthenticated, profile } = useAuth();
  const { currentProjectId } = useProjects();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Store callback in ref to prevent infinite loops
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;

  // Store fileIdMap in ref to prevent subscription churn
  const fileIdMapRef = useRef(fileIdMap);
  fileIdMapRef.current = fileIdMap;

  const supabase = isSupabaseConfigured() ? getSupabaseClient() : null;

  // Fetch all annotations for the current project's files
  const fetchRemoteAnnotations = useCallback(async (): Promise<LineAnnotation[]> => {
    const currentFileIdMap = fileIdMapRef.current;
    if (!supabase || !currentProjectId || Object.keys(currentFileIdMap).length === 0) {
      return [];
    }

    const fileIds = Object.values(currentFileIdMap);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("annotations")
      .select("*")
      .in("file_id", fileIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching annotations:", error);
      return [];
    }

    // Convert to local format, mapping file_id back to codeFileId
    const reverseMap = Object.fromEntries(
      Object.entries(currentFileIdMap).map(([k, v]) => [v, k])
    );

    return (data || []).map((row: AnnotationRow) =>
      rowToAnnotation(row, reverseMap[row.file_id] || row.file_id)
    );
  }, [supabase, currentProjectId]);

  // Push a new or updated annotation to Supabase
  const pushAnnotation = useCallback(
    async (annotation: LineAnnotation) => {
      console.log("pushAnnotation called:", {
        hasSupabase: !!supabase,
        enabled,
        isAuthenticated,
        currentProjectId,
        annotationId: annotation.id,
        addedBy: annotation.addedBy,
      });

      if (!supabase || !enabled || !isAuthenticated || !currentProjectId) {
        console.log("pushAnnotation: skipped due to missing conditions");
        return;
      }

      const currentFileIdMap = fileIdMapRef.current;
      const fileId = currentFileIdMap[annotation.codeFileId];
      console.log("pushAnnotation: fileId lookup", { codeFileId: annotation.codeFileId, fileId, fileIdMap: currentFileIdMap });
      if (!fileId) {
        console.warn("No Supabase file_id for annotation:", annotation.codeFileId);
        return;
      }

      // Mark that we're making an update (to skip processing our own changes)
      lastUpdateRef.current = Date.now();

      const row = annotationToRow(annotation, fileId, currentProjectId, user?.id ?? null);
      console.log("pushAnnotation: upserting row", row);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("annotations")
          .upsert(row, { onConflict: "id" })
          .select();

        if (error) {
          console.error("pushAnnotation: Database error:", error);
          console.error("pushAnnotation: Error details:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
        } else {
          console.log("pushAnnotation: Successfully saved", data);
        }
      } catch (err) {
        console.error("pushAnnotation: Exception caught:", err);
      }
    },
    [supabase, enabled, isAuthenticated, currentProjectId, user?.id]
  );

  // Delete an annotation from Supabase
  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      console.log("deleteAnnotation called:", {
        annotationId,
        hasSupabase: !!supabase,
        enabled,
        isAuthenticated,
      });

      if (!supabase || !enabled || !isAuthenticated) {
        console.log("deleteAnnotation: skipped due to missing conditions");
        return;
      }

      // Mark that we're making an update (to skip processing our own changes)
      lastUpdateRef.current = Date.now();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error, count } = await (supabase as any)
        .from("annotations")
        .delete()
        .eq("id", annotationId);

      if (error) {
        console.error("Error deleting annotation:", error);
      } else {
        console.log("deleteAnnotation: success, count:", count);
      }
    },
    [supabase, enabled, isAuthenticated]
  );

  // Helper to fetch and update annotations
  const fetchAndUpdate = useCallback(async () => {
    console.log("fetchAndUpdate: Starting fetch");
    const currentFileIdMap = fileIdMapRef.current;
    if (!supabase || !currentProjectId || Object.keys(currentFileIdMap).length === 0) {
      console.warn("fetchAndUpdate: Preconditions not met", { supabase: !!supabase, currentProjectId, fileIdMapCount: Object.keys(currentFileIdMap).length });
      return;
    }

    const fileIds = Object.values(currentFileIdMap);
    const reverseMap = Object.fromEntries(
      Object.entries(currentFileIdMap).map(([k, v]) => [v, k])
    );

    try {
      // Fetch annotations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("annotations")
        .select("*")
        .in("file_id", fileIds)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("fetchAndUpdate: Error fetching annotations:", error);
        console.error("fetchAndUpdate: Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fileIds,
        });
        return;
      }

      const annotations = data || [];
      console.log(`fetchAndUpdate: Fetched ${annotations.length} annotations, calling onRemoteChange`);
      const annotationIds = annotations.map((a: AnnotationRow) => a.id);

      // Fetch replies for all annotations with profile colors
      let repliesMap: Record<string, Array<{
        id: string;
        content: string;
        created_at: string;
        added_by_initials: string | null;
        profile_color: string | null;
      }>> = {};

      if (annotationIds.length > 0) {
        // Fetch replies with profile_color stored in the table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: repliesData, error: repliesError } = await (supabase as any)
          .from("annotation_replies")
          .select("id, annotation_id, content, created_at, added_by_initials, profile_color")
          .in("annotation_id", annotationIds)
          .order("created_at", { ascending: true });

        if (repliesError) {
          console.error("Error fetching replies:", repliesError);
        }

        if (repliesData) {
          repliesData.forEach((reply: {
            annotation_id: string;
            id: string;
            content: string;
            created_at: string;
            added_by_initials: string | null;
            profile_color: string | null;
          }) => {
            if (!repliesMap[reply.annotation_id]) {
              repliesMap[reply.annotation_id] = [];
            }
            repliesMap[reply.annotation_id].push({
              id: reply.id,
              content: reply.content,
              created_at: reply.created_at,
              added_by_initials: reply.added_by_initials,
              profile_color: reply.profile_color,
            });
          });
        }
      }

      const remoteAnnotations = annotations.map((row: AnnotationRow) => {
        const annotation = rowToAnnotation(row, reverseMap[row.file_id] || row.file_id);
        // Attach replies to annotation
        const replies = repliesMap[row.id];
        if (replies) {
          annotation.replies = replies.map(r => ({
            id: r.id,
            content: r.content,
            createdAt: r.created_at,
            addedBy: r.added_by_initials || undefined,
            profileColor: r.profile_color || undefined,
          }));
        }
        return annotation;
      });
      console.log("fetchAndUpdate: Fetched", remoteAnnotations.length, "annotations, calling onRemoteChange");
      console.log("fetchAndUpdate: Replies by annotation:", Object.keys(repliesMap).map(id => ({ id, count: repliesMap[id].length })));
      onRemoteChangeRef.current(remoteAnnotations);
    } catch (err) {
      console.error("Error in fetchAndUpdate:", err);
    }
  }, [supabase, currentProjectId]);

  // Push a new reply to an annotation
  const pushReply = useCallback(
    async (annotationId: string, content: string, replyId?: string) => {
      if (!supabase || !enabled || !isAuthenticated || !currentProjectId) {
        console.warn("pushReply: Preconditions not met", { supabase: !!supabase, enabled, isAuthenticated, currentProjectId });
        return;
      }

      const userInitials = user?.user_metadata?.initials || user?.email?.substring(0, 3).toUpperCase();

      const row = {
        id: replyId || crypto.randomUUID(),
        annotation_id: annotationId,
        project_id: currentProjectId,
        user_id: user?.id || null,
        added_by_initials: userInitials || null,
        profile_color: profile?.profile_color || null,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("pushReply: Saving reply to database", { annotationId, content, replyId: row.id, userId: user?.id });

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("annotation_replies")
          .upsert(row, { onConflict: "id" })
          .select();

        if (error) {
          console.error("pushReply: Database error:", error);
          console.error("pushReply: Error details:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            row,
          });
        } else {
          console.log("pushReply: Reply saved successfully", data);
          console.log("pushReply: Triggering fetchAndUpdate in 200ms");
          // Trigger a fetch to update replies
          lastUpdateRef.current = Date.now();
          setTimeout(() => {
            console.log("pushReply: Calling fetchAndUpdate now");
            fetchAndUpdate();
          }, 200);
        }
      } catch (err) {
        console.error("pushReply: Exception caught:", err);
      }
    },
    [supabase, enabled, isAuthenticated, currentProjectId, user, profile, fetchAndUpdate]
  );

  // Delete a reply from an annotation
  const deleteReply = useCallback(
    async (replyId: string) => {
      if (!supabase || !enabled || !isAuthenticated) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("annotation_replies")
        .delete()
        .eq("id", replyId);

      if (error) {
        console.error("Error deleting reply:", error);
      } else {
        // Trigger a fetch to update replies
        lastUpdateRef.current = Date.now();
        setTimeout(() => fetchAndUpdate(), 200);
      }
    },
    [supabase, enabled, isAuthenticated, fetchAndUpdate]
  );

  // Polling interval (5 seconds) - reliable baseline for sync
  // Also handles visibility change to resume sync when tab becomes active (Safari suspension fix)
  useEffect(() => {
    if (!supabase || !enabled || !currentProjectId) {
      return;
    }

    // Initial fetch after short delay to let fileIdMap populate
    const initialTimeoutId = setTimeout(fetchAndUpdate, 100);

    // Poll every 5 seconds
    const intervalId = setInterval(() => {
      // Skip if we just made an update (to avoid processing our own changes)
      const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
      if (timeSinceLastUpdate < 2000) return;

      const currentFileIdMap = fileIdMapRef.current;
      if (Object.keys(currentFileIdMap).length > 0) {
        fetchAndUpdate();
      }
    }, 5000);

    // Resume sync immediately when tab becomes visible (fixes Safari suspension)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, triggering annotation sync");
        const currentFileIdMap = fileIdMapRef.current;
        if (Object.keys(currentFileIdMap).length > 0) {
          fetchAndUpdate();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(initialTimeoutId);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [supabase, enabled, currentProjectId, fetchAndUpdate]);

  // Realtime subscription disabled due to persistent "mismatch between server and client bindings" error
  // Polling (5s) provides reliable sync. Re-enable Realtime once Supabase issue is resolved.
  // See: https://github.com/supabase/realtime/issues
  /*
  useEffect(() => {
    if (!supabase || !enabled || !currentProjectId) {
      return;
    }

    let channel: RealtimeChannel | null = null;

    try {
      const channelName = `annotations-${currentProjectId}-${Date.now()}`;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "annotations",
          },
          (payload) => {
            const newRecord = payload.new as AnnotationRow | undefined;
            const oldRecord = payload.old as AnnotationRow | undefined;

            const recordProjectId = newRecord?.project_id || oldRecord?.project_id;
            if (recordProjectId !== currentProjectId) {
              return;
            }

            if (newRecord?.user_id === user?.id) {
              return;
            }

            console.log("Realtime: Annotation change detected, triggering fetch");
            fetchAndUpdate();
          }
        )
        .subscribe((status) => {
          console.log("Annotations subscription status:", status);
          if (status === "CHANNEL_ERROR") {
            console.warn("Realtime channel error - polling will continue as fallback");
          }
        });

      channelRef.current = channel;
    } catch (err) {
      console.error("Error setting up Realtime subscription:", err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("Error removing channel:", err);
        }
        channelRef.current = null;
      }
    };
  }, [supabase, enabled, currentProjectId, user?.id, fetchAndUpdate]);
  */

  return {
    pushAnnotation,
    deleteAnnotation,
    pushReply,
    deleteReply,
    fetchRemoteAnnotations,
    isConnected: !!channelRef.current,
  };
}
