"use client";

/**
 * Projects Context
 *
 * Manages shared projects stored in Supabase.
 * Provides methods to create, load, save, and share projects.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "./AuthContext";
import type { Project, ProjectWithOwner, Profile, MemberWithProfile, MemberRole, LibraryProject, AccessionStatus, CodeFile, Annotation } from "@/lib/supabase/types";
import type { Session, EntryMode } from "@/types/session";
import { DEFAULT_DISPLAY_SETTINGS } from "@/types/session";

interface ProjectsContextValue {
  // State
  projects: ProjectWithOwner[];
  isLoading: boolean;
  currentProjectId: string | null;

  // Project CRUD
  createProject: (name: string, description?: string, mode?: EntryMode) => Promise<{ project: Project | null; initialSession: Partial<Session> | null; error: Error | null }>;
  loadProject: (projectId: string) => Promise<{ session: Session | null; error: Error | null }>;
  saveProject: (projectId: string, session: Session) => Promise<{ error: Error | null }>;
  deleteProject: (projectId: string) => Promise<{ error: Error | null }>; // Soft delete (moves to trash)
  renameProject: (projectId: string, newName: string) => Promise<{ error: Error | null }>;

  // Trash
  trashedProjects: ProjectWithOwner[];
  isLoadingTrash: boolean;
  fetchTrashedProjects: () => Promise<void>;
  restoreProject: (projectId: string) => Promise<{ error: Error | null }>;
  permanentlyDeleteProject: (projectId: string) => Promise<{ error: Error | null }>;
  emptyTrash: () => Promise<{ error: Error | null }>;

  // Project management
  refreshProjects: () => Promise<void>;
  setCurrentProjectId: (id: string | null) => void;

  // Member management
  getProjectMembers: (projectId: string) => Promise<{ members: MemberWithProfile[]; error: Error | null }>;
  createInviteLink: (projectId: string, role: "editor" | "viewer") => Promise<{ inviteUrl: string | null; error: Error | null }>;
  removeMember: (projectId: string, userId: string) => Promise<{ error: Error | null }>;
  updateMemberRole: (projectId: string, userId: string, role: MemberRole) => Promise<{ error: Error | null }>;
  joinProjectByInvite: (token: string) => Promise<{ project: Project | null; error: Error | null }>;

  // Modal state
  showProjectsModal: boolean;
  setShowProjectsModal: (show: boolean) => void;
  showMembersModal: boolean;
  setShowMembersModal: (show: boolean) => void;
  membersModalProjectId: string | null;
  setMembersModalProjectId: (id: string | null) => void;

  // Library state
  libraryProjects: LibraryProject[];
  isLoadingLibrary: boolean;
  showLibraryModal: boolean;
  setShowLibraryModal: (show: boolean) => void;
  viewingLibraryProjectId: string | null;
  setViewingLibraryProjectId: (id: string | null) => void;

  // Library functions
  fetchLibraryProjects: () => Promise<void>;
  loadLibraryProject: (projectId: string) => Promise<{ session: Session | null; error: Error | null }>;
  copyLibraryProject: (projectId: string, newName?: string) => Promise<{ project: Project | null; error: Error | null }>;
  submitForReview: (projectId: string) => Promise<{ error: Error | null }>;

  // Admin state
  pendingSubmissions: LibraryProject[];
  isLoadingAdmin: boolean;
  showAdminModal: boolean;
  setShowAdminModal: (show: boolean) => void;

  // Admin functions
  fetchPendingSubmissions: () => Promise<void>;
  approveProject: (projectId: string) => Promise<{ error: Error | null }>;
  rejectProject: (projectId: string, reason?: string) => Promise<{ error: Error | null }>;
  adminDeleteProject: (projectId: string) => Promise<{ error: Error | null }>;
  adminRenameProject: (projectId: string, newName: string) => Promise<{ error: Error | null }>;
  deaccessionProject: (projectId: string) => Promise<{ error: Error | null }>;
  adminDuplicateProject: (projectId: string) => Promise<{ project: Project | null; error: Error | null }>;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<ProjectWithOwner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [membersModalProjectId, setMembersModalProjectId] = useState<string | null>(null);

  // Library state
  const [libraryProjects, setLibraryProjects] = useState<LibraryProject[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [viewingLibraryProjectId, setViewingLibraryProjectId] = useState<string | null>(null);

  // Admin state
  const [pendingSubmissions, setPendingSubmissions] = useState<LibraryProject[]>([]);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Trash state
  const [trashedProjects, setTrashedProjects] = useState<ProjectWithOwner[]>([]);
  const [isLoadingTrash, setIsLoadingTrash] = useState(false);

  const isSupabaseEnabled = isSupabaseConfigured();
  const supabase = isSupabaseEnabled ? getSupabaseClient() : null;

  // Fetch user's projects (owned + shared) - OPTIMIZED: parallel queries
  const fetchProjects = useCallback(async () => {
    if (!supabase || !user) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Timeout to prevent infinite loading (Safari suspension issue)
    const loadingTimeout = setTimeout(() => {
      console.warn("fetchProjects: Loading timeout reached, forcing isLoading=false");
      setIsLoading(false);
    }, 10000);

    try {
      // Run owned and shared queries in parallel
      const [ownedResult, sharedResult] = await Promise.all([
        // Get projects the user owns (excluding trashed)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("projects")
          .select("*")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false }),
        // Get project IDs shared with the user
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("project_members")
          .select("project_id")
          .eq("user_id", user.id),
      ]);

      const { data: ownedProjects, error: ownedError } = ownedResult;
      const { data: sharedProjects, error: sharedError } = sharedResult;

      if (ownedError && Object.keys(ownedError).length > 0) {
        console.error("Error fetching owned projects:", ownedError.message);
      }
      if (sharedError && Object.keys(sharedError).length > 0) {
        console.error("Error fetching shared projects:", sharedError.message);
      }

      // Fetch shared project details if any (only IDs not already owned)
      const owned = ownedProjects || [];
      const ownedIds = new Set(owned.map((p: Project) => p.id));
      const sharedIds = (sharedProjects || [])
        .map((p: { project_id: string }) => p.project_id)
        .filter((id: string) => !ownedIds.has(id));

      let sharedProjectDetails: Project[] = [];
      if (sharedIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sharedData } = await (supabase as any)
          .from("projects")
          .select("*")
          .in("id", sharedIds)
          .is("deleted_at", null); // Exclude trashed projects
        sharedProjectDetails = sharedData || [];
      }

      // Combine (already deduplicated by filtering sharedIds)
      const allProjects = [...owned, ...sharedProjectDetails];

      // Sort by updated_at
      allProjects.sort((a: Project, b: Project) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setProjects(allProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
    }
  }, [supabase, user]);

  // Fetch projects when user changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    } else {
      setProjects([]);
      setCurrentProjectId(null);
    }
  }, [isAuthenticated, fetchProjects]);

  // Create a new project
  const createProject = useCallback(async (
    name: string,
    description?: string,
    mode: EntryMode = "critique"
  ) => {
    if (!supabase || !user) {
      return { project: null, initialSession: null, error: new Error("Not authenticated") };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("projects")
        .insert({
          name,
          description: description || null,
          owner_id: user.id,
          mode,
          session_data: null,
        })
        .select()
        .single();

      if (error) {
        return { project: null, initialSession: null, error: new Error(error.message) };
      }

      const project = data as Project;

      // Get creator name from user metadata
      const creatorName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Unknown";
      const today = new Date().toISOString().split("T")[0];

      // Create README.md template
      const readmeContent = `# ${name}

## Project Information

| Field | Value |
|-------|-------|
| **Creator** | ${creatorName} |
| **Version** | 1.0 |
| **Created** | ${today} |

## Description

${description || "_Add a description of the project and its purpose here._"}

## Code Files

## Analysis Notes

_Record observations, questions, and insights from your critical code analysis:_

-

## References

_Add relevant references, documentation links, or related scholarship:_

-
`;

      // Insert README.md into code_files table
      const readmeId = crypto.randomUUID();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: fileError } = await (supabase as any)
        .from("code_files")
        .insert({
          id: readmeId,
          project_id: project.id,
          filename: "README.md",
          language: "markdown",
          content: readmeContent,
          original_content: readmeContent,
          uploaded_by: user.id,
        });

      if (fileError) {
        console.error("Error creating README.md:", fileError);
        // Don't fail project creation if README fails
      } else {
        console.log("createProject: README.md created successfully with id:", readmeId);
      }

      // Add to local state instead of full refresh
      setProjects(prev => [project as ProjectWithOwner, ...prev]);

      // Build initial session with the README we just created
      // This avoids a race condition where loadProject might run before the DB commits
      const initialSession = !fileError ? {
        codeFiles: [{
          id: readmeId,
          name: "README.md",
          language: "markdown",
          source: "shared" as const,
          size: readmeContent.length,
          uploadedAt: new Date().toISOString(),
        }],
        codeContents: { [readmeId]: readmeContent },
        lineAnnotations: [],
        messages: [],
        mode,
      } : null;

      return { project, initialSession, error: null };
    } catch (error) {
      return { project: null, initialSession: null, error: error as Error };
    }
  }, [supabase, user, fetchProjects]);

  // Load a project's session data - OPTIMIZED: parallel queries
  // Files and annotations are loaded from their respective tables (code_files, annotations)
  // NOT from session_data, which only stores other session state (messages, mode, etc.)
  const loadProject = useCallback(async (projectId: string) => {
    if (!supabase) {
      return { session: null, error: new Error("Supabase not configured") };
    }

    try {
      // Fetch project, files, and annotations in parallel
      const [projectResult, filesResult, annotationsResult] = await Promise.all([
        // Project metadata
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single(),
        // Code files (with display_order)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("code_files")
          .select("*")
          .eq("project_id", projectId)
          .order("display_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true }),
        // Annotations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("annotations")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: true }),
      ]);

      const { data: projectData, error: projectError } = projectResult;
      let { data: codeFilesData, error: filesError } = filesResult;
      const { data: annotationsData, error: annotationsError } = annotationsResult;

      if (projectError) {
        return { session: null, error: new Error(projectError.message) };
      }

      // Fallback: if display_order column doesn't exist yet, query without it
      if (filesError) {
        console.warn("Fetching code files with display_order failed, trying without:", filesError);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fallback = await (supabase as any)
          .from("code_files")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: true });
        codeFilesData = fallback.data;
        filesError = fallback.error;
      }

      if (filesError) {
        console.error("Error fetching code files:", filesError);
      }

      if (annotationsError) {
        console.error("Error fetching annotations:", annotationsError);
      }

      // Build codeFiles and codeContents from database
      const codeFiles = (codeFilesData || []).map((row: {
        id: string;
        filename: string;
        language: string | null;
        content: string;
        created_at: string;
      }) => ({
        id: row.id,
        name: row.filename,
        language: row.language || "plaintext",
        source: "shared" as const,
        size: row.content?.length || 0,
        uploadedAt: row.created_at,
      }));

      const codeContents: Record<string, string> = {};
      for (const row of codeFilesData || []) {
        codeContents[row.id] = row.content || "";
      }

      // Build lineAnnotations from database
      const lineAnnotations = (annotationsData || []).map((row: {
        id: string;
        file_id: string;
        line_number: number;
        end_line_number: number | null;
        line_content: string | null;
        type: string;
        content: string;
        created_at: string;
        user_id: string | null;
      }) => ({
        id: row.id,
        codeFileId: row.file_id,
        lineNumber: row.line_number,
        endLineNumber: row.end_line_number || undefined,
        lineContent: row.line_content || "",
        type: row.type as "observation" | "question" | "metaphor" | "pattern" | "context" | "critique",
        content: row.content,
        createdAt: row.created_at,
        addedBy: undefined, // Could fetch from profiles if needed
      }));

      // Build session: use session_data for other fields, but override files/annotations from tables
      const baseSession = projectData.session_data || {};
      const session: Session = {
        id: baseSession.id || projectId,
        mode: baseSession.mode || projectData.mode || "critique",
        experienceLevel: baseSession.experienceLevel,
        languageOverride: baseSession.languageOverride,
        messages: baseSession.messages || [],
        codeFiles,
        codeContents,
        lineAnnotations,
        analysisResults: baseSession.analysisResults || [],
        references: baseSession.references || [],
        critiqueArtifacts: baseSession.critiqueArtifacts || [],
        settings: baseSession.settings || { teachMeMode: false },
        displaySettings: baseSession.displaySettings || DEFAULT_DISPLAY_SETTINGS,
        currentPhase: baseSession.currentPhase || "opening",
        feedbackEscalation: baseSession.feedbackEscalation || 0,
        createdAt: baseSession.createdAt || projectData.created_at,
        lastModified: baseSession.lastModified || projectData.updated_at,
        createState: baseSession.createState,
      };

      console.log(`loadProject: Loaded ${codeFiles.length} files, ${lineAnnotations.length} annotations from database`);

      setCurrentProjectId(projectId);
      return { session, error: null };
    } catch (error) {
      return { session: null, error: error as Error };
    }
  }, [supabase]);

  // Save session to a project - OPTIMIZED: bulk upserts + parallel queries
  // Files and annotations are saved to their respective tables (code_files, annotations)
  // session_data only stores other session state (messages, mode, settings, etc.)
  const saveProject = useCallback(async (projectId: string, session: Session) => {
    console.log("saveProject: Starting save to", projectId);
    if (!supabase || !user) {
      console.error("saveProject: Supabase not configured or not authenticated");
      return { error: new Error("Supabase not configured or not authenticated") };
    }

    try {
      const now = new Date().toISOString();

      // Build bulk data for files (skip README update - too expensive for every save)
      const filesData = session.codeFiles
        .map((file, i) => {
          const content = session.codeContents[file.id];
          if (content === undefined) return null;
          return {
            id: file.id,
            project_id: projectId,
            filename: file.name,
            language: file.language || "plaintext",
            content: content,
            original_content: content,
            uploaded_by: user.id,
            display_order: i,
            updated_at: now,
          };
        })
        .filter(Boolean);

      // Build bulk data for annotations
      const annotationsData = session.lineAnnotations.map(annotation => ({
        id: annotation.id,
        file_id: annotation.codeFileId,
        project_id: projectId,
        user_id: user.id,
        line_number: annotation.lineNumber,
        end_line_number: annotation.endLineNumber || null,
        line_content: annotation.lineContent || null,
        type: annotation.type,
        content: annotation.content,
        updated_at: now,
      }));

      // Session data without files/annotations (stored separately)
      const sessionDataWithoutFiles = {
        ...session,
        codeFiles: [],
        codeContents: {},
        lineAnnotations: [],
      };

      const projectUpdateData = {
        session_data: sessionDataWithoutFiles,
        mode: session.mode,
        updated_at: now,
      };

      // Run all upserts and fetches in parallel
      console.log(`saveProject: Bulk saving ${filesData.length} files, ${annotationsData.length} annotations`);

      const [filesUpsertResult, annotationsUpsertResult, projectUpdateResult, existingFilesResult, existingAnnotationsResult] = await Promise.all([
        // Bulk upsert files
        filesData.length > 0
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (supabase as any).from("code_files").upsert(filesData, { onConflict: "id" })
          : Promise.resolve({ error: null }),
        // Bulk upsert annotations
        annotationsData.length > 0
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (supabase as any).from("annotations").upsert(annotationsData, { onConflict: "id" })
          : Promise.resolve({ error: null }),
        // Update project metadata
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("projects").update(projectUpdateData).eq("id", projectId).select(),
        // Get existing file IDs for deletion check
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("code_files").select("id").eq("project_id", projectId),
        // Get existing annotation IDs for deletion check
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("annotations").select("id").eq("project_id", projectId),
      ]);

      if (filesUpsertResult.error) {
        console.error("saveProject: Error bulk saving files", filesUpsertResult.error);
      }
      if (annotationsUpsertResult.error) {
        console.error("saveProject: Error bulk saving annotations", annotationsUpsertResult.error);
      }
      if (projectUpdateResult.error) {
        console.error("saveProject: Error updating project", projectUpdateResult.error);
        return { error: new Error(projectUpdateResult.error.message) };
      }

      // Calculate orphans to delete
      const sessionFileIds = new Set(session.codeFiles.map(f => f.id));
      const filesToDelete = (existingFilesResult.data || [])
        .filter((f: { id: string }) => !sessionFileIds.has(f.id))
        .map((f: { id: string }) => f.id);

      const sessionAnnotationIds = new Set(session.lineAnnotations.map(a => a.id));
      const annotationsToDelete = (existingAnnotationsResult.data || [])
        .filter((a: { id: string }) => !sessionAnnotationIds.has(a.id))
        .map((a: { id: string }) => a.id);

      // Delete orphans in parallel (if any)
      if (filesToDelete.length > 0 || annotationsToDelete.length > 0) {
        console.log(`saveProject: Deleting ${filesToDelete.length} orphan files, ${annotationsToDelete.length} orphan annotations`);
        await Promise.all([
          filesToDelete.length > 0
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? (supabase as any).from("code_files").delete().in("id", filesToDelete)
            : Promise.resolve(),
          annotationsToDelete.length > 0
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? (supabase as any).from("annotations").delete().in("id", annotationsToDelete)
            : Promise.resolve(),
        ]);
      }

      console.log("saveProject: Success");

      // Update local state instead of full refresh (just update timestamp)
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, updated_at: now } : p
      ));

      return { error: null };
    } catch (error) {
      console.error("saveProject: Exception", error);
      return { error: error as Error };
    }
  }, [supabase, user]);

  // Delete a project (only owner can delete, protects library projects which have null owner_id)
  // Soft delete - moves project to trash (set deleted_at timestamp)
  const deleteProject = useCallback(async (projectId: string) => {
    if (!supabase || !user) {
      return { error: new Error("Not authenticated") };
    }

    try {
      // Soft delete: set deleted_at timestamp instead of actual deletion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("projects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", projectId)
        .eq("owner_id", user.id); // Only allow deletion if user is the owner

      if (error) {
        return { error: new Error(error.message) };
      }

      // Clear current project if it was deleted
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }

      // Move from projects to trashedProjects in local state
      const deletedProject = projects.find(p => p.id === projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (deletedProject) {
        setTrashedProjects(prev => [{ ...deletedProject, deleted_at: new Date().toISOString() }, ...prev]);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase, user, currentProjectId, projects]);

  // Rename a project (only owner can rename)
  const renameProject = useCallback(async (projectId: string, newName: string) => {
    if (!supabase || !user) {
      return { error: new Error("Not authenticated") };
    }

    // Strip leading $ characters (reserved for library namespace) and trim
    const sanitizedName = newName.replace(/^\$+/, "").trim();

    if (!sanitizedName) {
      return { error: new Error("Project name cannot be empty") };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("projects")
        .update({ name: sanitizedName, updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .eq("owner_id", user.id); // Only allow rename if user is the owner

      if (error) {
        return { error: new Error(error.message) };
      }

      // Update local state
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, name: sanitizedName } : p
      ));

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase, user]);

  // Fetch trashed projects (soft-deleted projects owned by user)
  const fetchTrashedProjects = useCallback(async () => {
    if (!supabase || !user) {
      setTrashedProjects([]);
      return;
    }

    setIsLoadingTrash(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("owner_id", user.id)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) {
        console.error("Error fetching trashed projects:", error.message);
        setTrashedProjects([]);
      } else {
        setTrashedProjects(data || []);
      }
    } catch (error) {
      console.error("Error fetching trashed projects:", error);
      setTrashedProjects([]);
    } finally {
      setIsLoadingTrash(false);
    }
  }, [supabase, user]);

  // Restore a project from trash (set deleted_at back to null)
  const restoreProject = useCallback(async (projectId: string) => {
    if (!supabase || !user) {
      return { error: new Error("Not authenticated") };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("projects")
        .update({ deleted_at: null })
        .eq("id", projectId)
        .eq("owner_id", user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Move from trashedProjects back to projects in local state
      const restoredProject = trashedProjects.find(p => p.id === projectId);
      setTrashedProjects(prev => prev.filter(p => p.id !== projectId));
      if (restoredProject) {
        setProjects(prev => [{ ...restoredProject, deleted_at: null }, ...prev]);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase, user, trashedProjects]);

  // Permanently delete a project (actual database deletion)
  const permanentlyDeleteProject = useCallback(async (projectId: string) => {
    if (!supabase || !user) {
      return { error: new Error("Not authenticated") };
    }

    try {
      // Delete annotations first (FK constraint)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("annotations")
        .delete()
        .eq("project_id", projectId);

      // Delete code files
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("code_files")
        .delete()
        .eq("project_id", projectId);

      // Delete project memberships
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("project_members")
        .delete()
        .eq("project_id", projectId);

      // Delete project invites
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("project_invites")
        .delete()
        .eq("project_id", projectId);

      // Delete the project itself
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("projects")
        .delete()
        .eq("id", projectId)
        .eq("owner_id", user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Clear currentProjectId if it matches the deleted project (defensive check)
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }

      // Remove from trashedProjects in local state
      setTrashedProjects(prev => prev.filter(p => p.id !== projectId));

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase, user, currentProjectId]);

  // Empty trash - permanently delete all trashed projects
  const emptyTrash = useCallback(async () => {
    if (!supabase || !user) {
      return { error: new Error("Not authenticated") };
    }

    try {
      // Get all trashed project IDs
      const trashedIds = trashedProjects.map(p => p.id);

      if (trashedIds.length === 0) {
        return { error: null };
      }

      // Delete annotations for all trashed projects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("annotations")
        .delete()
        .in("project_id", trashedIds);

      // Delete code files for all trashed projects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("code_files")
        .delete()
        .in("project_id", trashedIds);

      // Delete project memberships for all trashed projects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("project_members")
        .delete()
        .in("project_id", trashedIds);

      // Delete project invites for all trashed projects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("project_invites")
        .delete()
        .in("project_id", trashedIds);

      // Delete all trashed projects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("projects")
        .delete()
        .in("id", trashedIds)
        .eq("owner_id", user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Clear currentProjectId if it was among the trashed projects (defensive check)
      if (currentProjectId && trashedIds.includes(currentProjectId)) {
        setCurrentProjectId(null);
      }

      // Clear trashedProjects in local state
      setTrashedProjects([]);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase, user, trashedProjects, currentProjectId]);

  // Get project members with profile info
  const getProjectMembers = useCallback(async (projectId: string) => {
    if (!supabase) {
      return { members: [], error: new Error("Supabase not configured") };
    }

    try {
      // Fetch members first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: membersData, error: membersError } = await (supabase as any)
        .from("project_members")
        .select("*")
        .eq("project_id", projectId);

      if (membersError) {
        return { members: [], error: new Error(membersError.message) };
      }

      if (!membersData || membersData.length === 0) {
        return { members: [], error: null };
      }

      // Fetch profiles for all members
      const userIds = membersData.map((m: { user_id: string }) => m.user_id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profilesData, error: profilesError } = await (supabase as any)
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Create a map of profiles by user_id
      const profilesMap: Record<string, Profile> = {};
      for (const profile of profilesData || []) {
        profilesMap[profile.id] = profile;
      }

      // Combine members with their profiles
      const membersWithProfiles: MemberWithProfile[] = membersData.map((member: {
        id: string;
        project_id: string;
        user_id: string;
        role: string;
        joined_at: string;
      }) => ({
        ...member,
        profile: profilesMap[member.user_id] || null,
      }));

      return { members: membersWithProfiles, error: null };
    } catch (error) {
      return { members: [], error: error as Error };
    }
  }, [supabase]);

  // Create a shareable invite link
  const createInviteLink = useCallback(async (projectId: string, role: "editor" | "viewer") => {
    if (!supabase || !user) {
      return { inviteUrl: null, error: new Error("Not authenticated") };
    }

    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 1 month

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("project_invites")
        .insert({
          project_id: projectId,
          token,
          role,
          created_by: user.id,
          expires_at: expiresAt,
        });

      if (error) {
        return { inviteUrl: null, error: new Error(error.message) };
      }

      const inviteUrl = `${window.location.origin}/invite/${token}`;
      return { inviteUrl, error: null };
    } catch (error) {
      return { inviteUrl: null, error: error as Error };
    }
  }, [supabase, user]);

  // Remove a member from a project
  const removeMember = useCallback(async (projectId: string, userId: string) => {
    if (!supabase) {
      return { error: new Error("Supabase not configured") };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase]);

  // Update a member's role
  const updateMemberRole = useCallback(async (projectId: string, userId: string, role: MemberRole) => {
    if (!supabase) {
      return { error: new Error("Supabase not configured") };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("project_members")
        .update({ role })
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase]);

  // Join a project via invite token
  const joinProjectByInvite = useCallback(async (token: string) => {
    if (!supabase || !user) {
      return { project: null, error: new Error("Not authenticated") };
    }

    try {
      // Fetch the invite and validate it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: invite, error: inviteError } = await (supabase as any)
        .from("project_invites")
        .select("*")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (inviteError || !invite) {
        return { project: null, error: new Error("Invalid or expired invite link") };
      }

      // Check if already a member
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from("project_members")
        .select("id")
        .eq("project_id", invite.project_id)
        .eq("user_id", user.id)
        .single();

      // If not already a member, add them FIRST (before trying to read project)
      // This is needed because RLS on projects table only allows owners/members to read
      if (!existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: memberError } = await (supabase as any)
          .from("project_members")
          .insert({
            project_id: invite.project_id,
            user_id: user.id,
            role: invite.role,
            joined_at: new Date().toISOString(),
          });

        if (memberError) {
          // If it's a duplicate key error, they're already a member (race condition)
          if (!memberError.message?.includes("duplicate")) {
            return { project: null, error: new Error(memberError.message) };
          }
        }
      }

      // NOW fetch the project (user is now a member, so RLS allows it)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: project, error: projectError } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("id", invite.project_id)
        .single();

      if (projectError || !project) {
        return { project: null, error: new Error("Project not found") };
      }

      // Add to local state instead of full refresh
      setProjects(prev => {
        // Don't add if already exists
        if (prev.some(p => p.id === project.id)) return prev;
        return [project as ProjectWithOwner, ...prev];
      });

      return { project: project as Project, error: null };
    } catch (error) {
      return { project: null, error: error as Error };
    }
  }, [supabase, user]);

  // =============================================================================
  // Library Functions
  // =============================================================================

  // Fetch public library projects (approved + submitted for "Early Access")
  const fetchLibraryProjects = useCallback(async () => {
    if (!supabase) return;

    setIsLoadingLibrary(true);

    try {
      // Fetch approved AND submitted public projects (submitted = "Early Access")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: projectsData, error: projectsError } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("is_public", true)
        .in("accession_status", ["approved", "submitted"])
        .order("approved_at", { ascending: false, nullsFirst: false })
        .order("submitted_at", { ascending: false });

      if (projectsError) {
        console.error("Error fetching library projects:", projectsError);
        return;
      }

      const projects = projectsData || [];

      // Fetch owner profiles separately
      const ownerIds = [...new Set(projects.map((p: Project) => p.owner_id).filter(Boolean))];
      let owners: Profile[] = [];
      if (ownerIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profilesData } = await (supabase as any)
          .from("profiles")
          .select("id, display_name, initials, affiliation")
          .in("id", ownerIds);
        owners = profilesData || [];
      }

      // Combine projects with owner info
      const ownerMap = new Map(owners.map((o: Profile) => [o.id, o]));
      const libraryProjectsWithOwners = projects.map((p: Project) => ({
        ...p,
        owner: ownerMap.get(p.owner_id) || undefined,
      }));

      setLibraryProjects(libraryProjectsWithOwners);
    } catch (error) {
      console.error("Error fetching library projects:", error);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [supabase]);

  // Load a library project in read-only mode
  const loadLibraryProject = useCallback(async (projectId: string) => {
    if (!supabase) {
      return { session: null, error: new Error("Supabase not configured") };
    }

    try {
      // Verify the project is in the library (approved or submitted/Early Access)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: projectCheck } = await (supabase as any)
        .from("projects")
        .select("id, is_public, accession_status")
        .eq("id", projectId)
        .eq("is_public", true)
        .in("accession_status", ["approved", "submitted"])
        .single();

      if (!projectCheck) {
        return { session: null, error: new Error("Project not found in library") };
      }

      // Use the existing loadProject logic to fetch session data
      const result = await loadProject(projectId);

      if (result.error) {
        return result;
      }

      // Mark as viewing library project (read-only)
      setViewingLibraryProjectId(projectId);

      // Don't set currentProjectId - we're just viewing, not joining
      setCurrentProjectId(null);

      return result;
    } catch (error) {
      return { session: null, error: error as Error };
    }
  }, [supabase, loadProject]);

  // Copy a library project to user's own projects
  const copyLibraryProject = useCallback(async (projectId: string, newName?: string) => {
    if (!supabase || !user) {
      return { project: null, error: new Error("Not authenticated") };
    }

    try {
      // 1. Fetch source project, files, and annotations in parallel
      const [projectResult, filesResult, annotationsResult] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .eq("is_public", true)
          .in("accession_status", ["approved", "submitted"])
          .single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("code_files")
          .select("*")
          .eq("project_id", projectId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("annotations")
          .select("*")
          .eq("project_id", projectId),
      ]);

      if (projectResult.error || !projectResult.data) {
        return { project: null, error: new Error("Project not found in library") };
      }

      const sourceProject = projectResult.data;
      const sourceFiles = filesResult.data || [];
      const sourceAnnotations = annotationsResult.data || [];

      // 2. Create new project with new owner
      const newProjectId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Strip $ namespace prefix from library project name for the copy
      const stripNamespacePrefix = (name: string) => name.replace(/^\$+/, "");
      const baseName = stripNamespacePrefix(sourceProject.name);
      const copyName = newName ? stripNamespacePrefix(newName) : `${baseName} (Copy)`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newProject, error: createError } = await (supabase as any)
        .from("projects")
        .insert({
          id: newProjectId,
          name: copyName,
          description: sourceProject.description,
          owner_id: user.id,
          mode: sourceProject.mode,
          session_data: sourceProject.session_data,
          // Reset library fields for the copy
          is_public: false,
          accession_status: "draft",
          submitted_at: null,
          reviewed_at: null,
          approved_at: null,
          approved_by: null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (createError) {
        return { project: null, error: new Error(createError.message) };
      }

      // 3. Copy all code_files with new IDs, building oldId -> newId map
      const fileIdMap = new Map<string, string>();
      const newFiles = sourceFiles.map((file: {
        id: string;
        filename: string;
        language: string | null;
        content: string;
        original_content: string | null;
        display_order: number | null;
      }) => {
        const newFileId = crypto.randomUUID();
        fileIdMap.set(file.id, newFileId);
        return {
          id: newFileId,
          project_id: newProjectId,
          filename: file.filename,
          language: file.language,
          content: file.content,
          original_content: file.original_content,
          uploaded_by: user.id,
          display_order: file.display_order,
          created_at: now,
          updated_at: now,
        };
      });

      if (newFiles.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: filesError } = await (supabase as any)
          .from("code_files")
          .insert(newFiles);

        if (filesError) {
          console.error("Error copying files:", filesError);
        }
      }

      // 4. Copy all annotations with remapped file_ids
      const newAnnotations = sourceAnnotations.map((annotation: {
        id: string;
        file_id: string;
        line_number: number;
        end_line_number: number | null;
        line_content: string | null;
        type: string;
        content: string;
      }) => ({
        id: crypto.randomUUID(),
        file_id: fileIdMap.get(annotation.file_id) || annotation.file_id,
        project_id: newProjectId,
        user_id: user.id,
        line_number: annotation.line_number,
        end_line_number: annotation.end_line_number,
        line_content: annotation.line_content,
        type: annotation.type,
        content: annotation.content,
        created_at: now,
        updated_at: now,
      }));

      if (newAnnotations.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: annotationsError } = await (supabase as any)
          .from("annotations")
          .insert(newAnnotations);

        if (annotationsError) {
          console.error("Error copying annotations:", annotationsError);
        }
      }

      console.log(`copyLibraryProject: Copied project with ${newFiles.length} files, ${newAnnotations.length} annotations`);

      // 5. Add to local projects list
      setProjects(prev => [newProject as ProjectWithOwner, ...prev]);

      // Clear read-only viewing state
      setViewingLibraryProjectId(null);

      return { project: newProject as Project, error: null };
    } catch (error) {
      return { project: null, error: error as Error };
    }
  }, [supabase, user]);

  // Submit a project for library review
  const submitForReview = useCallback(async (projectId: string) => {
    if (!supabase || !user) {
      return { error: new Error("Not authenticated") };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("projects")
        .update({
          is_public: true,
          accession_status: "submitted" as AccessionStatus,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("owner_id", user.id); // Only owner can submit

      if (error) {
        return { error: new Error(error.message) };
      }

      // Update local state
      setProjects(prev => prev.map(p =>
        p.id === projectId
          ? { ...p, is_public: true, accession_status: "submitted" as AccessionStatus }
          : p
      ));

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase, user]);

  // =============================================================================
  // Admin Functions
  // =============================================================================

  // Fetch projects pending admin review
  const fetchPendingSubmissions = useCallback(async () => {
    if (!supabase) return;

    setIsLoadingAdmin(true);
    console.log("Fetching pending submissions...");

    try {
      // Fetch submitted projects (without FK join - FK doesn't exist)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: projectsData, error: projectsError } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("is_public", true)
        .eq("accession_status", "submitted")
        .order("submitted_at", { ascending: true });

      console.log("Pending submissions result:", { data: projectsData, error: projectsError, count: projectsData?.length });

      if (projectsError) {
        console.error("Error fetching pending submissions:", projectsError);
        return;
      }

      const projects = projectsData || [];

      // Fetch owner profiles separately
      const ownerIds = [...new Set(projects.map((p: Project) => p.owner_id).filter(Boolean))];
      let owners: Profile[] = [];
      if (ownerIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profilesData } = await (supabase as any)
          .from("profiles")
          .select("id, display_name, initials, affiliation")
          .in("id", ownerIds);
        owners = profilesData || [];
      }

      // Combine projects with owner info
      const ownerMap = new Map(owners.map((o: Profile) => [o.id, o]));
      const submissionsWithOwners = projects.map((p: Project) => ({
        ...p,
        owner: ownerMap.get(p.owner_id) || undefined,
      }));

      setPendingSubmissions(submissionsWithOwners);
    } catch (error) {
      console.error("Error fetching pending submissions:", error);
    } finally {
      setIsLoadingAdmin(false);
    }
  }, [supabase]);

  // Approve a submitted project (admin only)
  // - Adds $ prefix to name (library namespace)
  // - Sets owner_id to null (public/community ownership)
  const approveProject = useCallback(async (projectId: string) => {
    if (!supabase || !user) {
      return { error: new Error("Not authenticated") };
    }

    try {
      // Get current project to check name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: project } = await (supabase as any)
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();

      // Add $ prefix if not already present (library namespace)
      const libraryName = project?.name?.startsWith("$")
        ? project.name
        : `$${project?.name || "Untitled"}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("projects")
        .update({
          name: libraryName,
          owner_id: null, // Transfer to public/community ownership
          accession_status: "approved" as AccessionStatus,
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq("id", projectId)
        .eq("accession_status", "submitted"); // Only approve submitted projects

      if (error) {
        return { error: new Error(error.message) };
      }

      // Remove from pending list
      setPendingSubmissions(prev => prev.filter(p => p.id !== projectId));

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase, user]);

  // Reject a submitted project (admin only)
  // Uses same pattern as approveProject - set owner_id to null to satisfy RLS WITH CHECK
  // The project becomes a "reviewed" library item that the user can copy back
  const rejectProject = useCallback(async (projectId: string, reason?: string) => {
    if (!supabase || !user) {
      return { error: new Error("Not authenticated") };
    }

    try {
      // Set owner_id to null (like approveProject) to satisfy RLS WITH CHECK
      // Use "reviewed" status (not "approved") to indicate rejection
      // The project stays in the system but isn't in the public library
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("projects")
        .update({
          is_public: false,
          owner_id: null, // Required for RLS to allow admin updates
          accession_status: "reviewed" as AccessionStatus,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("accession_status", "submitted"); // Only reject submitted projects

      if (error) {
        return { error: new Error(error.message) };
      }

      // If a reason was provided, create LIBRARY_REJECT.md in the project
      if (reason && reason.trim()) {
        const rejectContent = `# Library Submission Rejected

**Date:** ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}

## Reason for Rejection

${reason.trim()}

---

*You may address these concerns and resubmit your project for review.*
`;

        // Check if LIBRARY_REJECT.md already exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingFile } = await (supabase as any)
          .from("code_files")
          .select("id")
          .eq("project_id", projectId)
          .eq("name", "LIBRARY_REJECT.md")
          .single();

        if (existingFile) {
          // Update existing file
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("code_files")
            .update({
              content: rejectContent,
              original_content: rejectContent,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingFile.id);
        } else {
          // Create new file
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("code_files")
            .insert({
              id: crypto.randomUUID(),
              project_id: projectId,
              name: "LIBRARY_REJECT.md",
              content: rejectContent,
              original_content: rejectContent,
              language: "markdown",
              display_order: 999, // Put at end of file list
            });
        }
      }

      // Remove from pending list
      setPendingSubmissions(prev => prev.filter(p => p.id !== projectId));

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase, user]);

  // Admin delete - soft delete any project (for cleaning up library)
  // Uses UPDATE with deleted_at because RLS allows admin updates but not deletes
  const adminDeleteProject = useCallback(async (projectId: string) => {
    if (!supabase || !user) {
      return { error: new Error("Not authenticated") };
    }

    try {
      // Soft delete by setting deleted_at (works with admin UPDATE policy)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error, data } = await (supabase as any)
        .from("projects")
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select();

      if (error) {
        return { error: new Error(error.message) };
      }

      // Check if update actually affected any rows
      if (!data || data.length === 0) {
        return { error: new Error("Project not found or could not be deleted") };
      }

      // Update local state
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setPendingSubmissions(prev => prev.filter(p => p.id !== projectId));
      setLibraryProjects(prev => prev.filter(p => p.id !== projectId));

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase, user]);

  // Admin rename - can rename any project
  const adminRenameProject = useCallback(async (projectId: string, newName: string) => {
    if (!supabase || !user) {
      return { error: new Error("Not authenticated") };
    }

    // Strip $ prefix (reserved for library namespace)
    const sanitizedName = newName.replace(/^\$+/, "").trim();
    if (!sanitizedName) {
      return { error: new Error("Project name cannot be empty") };
    }

    try {
      // Admin RLS should allow updating any project
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("projects")
        .update({ name: sanitizedName, updated_at: new Date().toISOString() })
        .eq("id", projectId);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Update local state
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, name: sanitizedName } : p
      ));
      setPendingSubmissions(prev => prev.map(p =>
        p.id === projectId ? { ...p, name: sanitizedName } : p
      ));
      setLibraryProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, name: sanitizedName } : p
      ));

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase, user]);

  // Deaccession - move approved project back to submitted (removes from library)
  const deaccessionProject = useCallback(async (projectId: string) => {
    if (!supabase || !user) {
      return { error: new Error("Not authenticated") };
    }

    try {
      // Get original project name (strip $ prefix if present)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: project } = await (supabase as any)
        .from("projects")
        .select("name, owner_id")
        .eq("id", projectId)
        .single();

      if (!project) {
        return { error: new Error("Project not found") };
      }

      // Strip $ namespace prefix if present
      const cleanName = project.name.replace(/^\$+/, "");

      // Move back to submitted status, restore owner if we have one stored
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("projects")
        .update({
          name: cleanName,
          is_public: true, // Keep public but change status
          accession_status: "submitted" as AccessionStatus,
          approved_at: null,
          approved_by: null,
        })
        .eq("id", projectId);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Update local state - remove from library, add to pending
      const deaccessionedProject = libraryProjects.find(p => p.id === projectId);
      setLibraryProjects(prev => prev.filter(p => p.id !== projectId));
      if (deaccessionedProject) {
        setPendingSubmissions(prev => [...prev, { ...deaccessionedProject, name: cleanName, accession_status: "submitted" }]);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase, user, libraryProjects]);

  // Admin duplicate - create a copy of a project (for variants or backups)
  const adminDuplicateProject = useCallback(async (projectId: string) => {
    if (!supabase || !user) {
      return { project: null, error: new Error("Not authenticated") };
    }

    try {
      // Fetch source project
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sourceProject, error: projectError } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError || !sourceProject) {
        return { project: null, error: new Error("Project not found") };
      }

      // Fetch files and annotations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [filesRes, annotationsRes] = await Promise.all([
        (supabase as any).from("code_files").select("*").eq("project_id", projectId),
        (supabase as any).from("annotations").select("*").eq("project_id", projectId),
      ]);

      const files = filesRes.data || [];
      const annotations = annotationsRes.data || [];

      // Create new project
      const newProjectId = crypto.randomUUID();
      const baseName = sourceProject.name.replace(/^\$+/, ""); // Strip $ prefix
      const newName = `${baseName} (Copy)`;

      const newProject = {
        id: newProjectId,
        name: newName,
        description: sourceProject.description,
        mode: sourceProject.mode,
        owner_id: user.id, // Admin becomes owner of copy
        is_public: false,
        accession_status: "draft" as AccessionStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from("projects")
        .insert(newProject);

      if (insertError) {
        return { project: null, error: new Error(insertError.message) };
      }

      // Copy files with new IDs
      const fileIdMap = new Map<string, string>();
      const newFiles = files.map((f: CodeFile) => {
        const newId = crypto.randomUUID();
        fileIdMap.set(f.id, newId);
        return {
          ...f,
          id: newId,
          project_id: newProjectId,
        };
      });

      if (newFiles.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("code_files").insert(newFiles);
      }

      // Copy annotations with remapped file IDs
      const newAnnotations = annotations.map((a: Annotation) => ({
        ...a,
        id: crypto.randomUUID(),
        file_id: fileIdMap.get(a.file_id) || a.file_id,
        project_id: newProjectId,
        user_id: user.id,
      }));

      if (newAnnotations.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("annotations").insert(newAnnotations);
      }

      // Refresh projects list
      await fetchProjects();

      return { project: newProject as Project, error: null };
    } catch (error) {
      return { project: null, error: error as Error };
    }
  }, [supabase, user, fetchProjects]);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        isLoading,
        currentProjectId,
        createProject,
        loadProject,
        saveProject,
        deleteProject,
        renameProject,
        // Trash
        trashedProjects,
        isLoadingTrash,
        fetchTrashedProjects,
        restoreProject,
        permanentlyDeleteProject,
        emptyTrash,
        refreshProjects: fetchProjects,
        setCurrentProjectId,
        getProjectMembers,
        createInviteLink,
        removeMember,
        updateMemberRole,
        joinProjectByInvite,
        showProjectsModal,
        setShowProjectsModal,
        showMembersModal,
        setShowMembersModal,
        membersModalProjectId,
        setMembersModalProjectId,
        // Library
        libraryProjects,
        isLoadingLibrary,
        showLibraryModal,
        setShowLibraryModal,
        viewingLibraryProjectId,
        setViewingLibraryProjectId,
        fetchLibraryProjects,
        loadLibraryProject,
        copyLibraryProject,
        submitForReview,
        // Admin
        pendingSubmissions,
        isLoadingAdmin,
        showAdminModal,
        setShowAdminModal,
        fetchPendingSubmissions,
        approveProject,
        rejectProject,
        adminDeleteProject,
        adminRenameProject,
        deaccessionProject,
        adminDuplicateProject,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}
