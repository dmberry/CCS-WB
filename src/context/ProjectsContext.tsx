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
import type { Project, ProjectWithOwner, Profile, MemberWithProfile, MemberRole } from "@/lib/supabase/types";
import type { Session, EntryMode } from "@/types/session";

interface ProjectsContextValue {
  // State
  projects: ProjectWithOwner[];
  isLoading: boolean;
  currentProjectId: string | null;

  // Project CRUD
  createProject: (name: string, description?: string, mode?: EntryMode) => Promise<{ project: Project | null; initialSession: Partial<Session> | null; error: Error | null }>;
  loadProject: (projectId: string) => Promise<{ session: Session | null; error: Error | null }>;
  saveProject: (projectId: string, session: Session) => Promise<{ error: Error | null }>;
  deleteProject: (projectId: string) => Promise<{ error: Error | null }>;

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

  const isSupabaseEnabled = isSupabaseConfigured();
  const supabase = isSupabaseEnabled ? getSupabaseClient() : null;

  // Fetch user's projects (owned + shared)
  const fetchProjects = useCallback(async () => {
    if (!supabase || !user) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    try {
      // Get projects the user owns (simple query without joins)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ownedProjects, error: ownedError } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });

      console.log("Owned projects result:", { data: ownedProjects, error: ownedError, errorKeys: ownedError ? Object.keys(ownedError) : null });
      if (ownedError && Object.keys(ownedError).length > 0) {
        console.error("Error fetching owned projects:", JSON.stringify(ownedError, null, 2), ownedError.message, ownedError.code);
      }

      // Get projects shared with the user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sharedProjects, error: sharedError } = await (supabase as any)
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id);

      console.log("Shared projects result:", { data: sharedProjects, error: sharedError, errorKeys: sharedError ? Object.keys(sharedError) : null });
      if (sharedError && Object.keys(sharedError).length > 0) {
        console.error("Error fetching shared projects:", JSON.stringify(sharedError, null, 2), sharedError.message, sharedError.code);
      }

      // Fetch shared project details if any
      let sharedProjectDetails: Project[] = [];
      if (sharedProjects && sharedProjects.length > 0) {
        const sharedIds = sharedProjects.map((p: { project_id: string }) => p.project_id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sharedData } = await (supabase as any)
          .from("projects")
          .select("*")
          .in("id", sharedIds);
        sharedProjectDetails = sharedData || [];
      }

      // Combine and deduplicate
      const owned = ownedProjects || [];
      const allProjects = [...owned];
      for (const project of sharedProjectDetails) {
        if (!allProjects.find((p: Project) => p.id === project.id)) {
          allProjects.push(project);
        }
      }

      // Sort by updated_at
      allProjects.sort((a: Project, b: Project) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setProjects(allProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
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

_This section updates automatically when the project is saved._

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

      // Refresh project list
      await fetchProjects();

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

  // Load a project's session data
  // Files and annotations are loaded from their respective tables (code_files, annotations)
  // NOT from session_data, which only stores other session state (messages, mode, etc.)
  const loadProject = useCallback(async (projectId: string) => {
    if (!supabase) {
      return { session: null, error: new Error("Supabase not configured") };
    }

    try {
      // Fetch project metadata and session_data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: projectData, error: projectError } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        return { session: null, error: new Error(projectError.message) };
      }

      // Fetch code files from code_files table (source of truth for files)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: codeFilesData, error: filesError } = await (supabase as any)
        .from("code_files")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (filesError) {
        console.error("Error fetching code files:", filesError);
      } else {
        console.log("loadProject: Fetched code_files from database:", {
          count: codeFilesData?.length,
          files: codeFilesData?.map((f: { filename: string; id: string }) => ({ name: f.filename, id: f.id })),
        });
      }

      // Fetch annotations from annotations table (source of truth for annotations)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: annotationsData, error: annotationsError } = await (supabase as any)
        .from("annotations")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

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

  // Save session to a project
  // Files and annotations are saved to their respective tables (code_files, annotations)
  // session_data only stores other session state (messages, mode, settings, etc.)
  const saveProject = useCallback(async (projectId: string, session: Session) => {
    console.log("saveProject: Starting save to", projectId);
    if (!supabase || !user) {
      console.error("saveProject: Supabase not configured or not authenticated");
      return { error: new Error("Supabase not configured or not authenticated") };
    }

    try {
      // 0. Update README.md with current file list (if README exists)
      const readmeFile = session.codeFiles.find(f => f.name.toLowerCase() === "readme.md");
      if (readmeFile) {
        const readmeContent = session.codeContents[readmeFile.id] || "";

        // Build file list (excluding README itself)
        const otherFiles = session.codeFiles.filter(f => f.name.toLowerCase() !== "readme.md");
        const fileListLines = otherFiles.map(f => {
          const content = session.codeContents[f.id] || "";
          const lineCount = content.split("\n").length;
          return `- \`${f.name}\` (${f.language}, ${lineCount} lines)`;
        });

        const fileListSection = fileListLines.length > 0
          ? fileListLines.join("\n")
          : "_No code files added yet._";

        // Replace the Code Files section content
        // Match from "## Code Files" to the next "##" heading or end of file
        const codeFilesRegex = /(## Code Files\s*\n)[\s\S]*?(?=\n## |\n---|$)/;

        if (codeFilesRegex.test(readmeContent)) {
          const updatedReadme = readmeContent.replace(
            codeFilesRegex,
            `$1\n${fileListSection}\n`
          );
          session.codeContents[readmeFile.id] = updatedReadme;
          console.log("saveProject: Updated README.md with file list");
        }
      }

      // 1. Save code files to code_files table
      console.log(`saveProject: Saving ${session.codeFiles.length} files to code_files table`);
      for (const file of session.codeFiles) {
        const content = session.codeContents[file.id];
        if (content === undefined) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: fileError } = await (supabase as any)
          .from("code_files")
          .upsert({
            id: file.id,
            project_id: projectId,
            filename: file.name,
            language: file.language || "plaintext",
            content: content,
            original_content: content,
            uploaded_by: user.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });

        if (fileError) {
          console.error("saveProject: Error saving file", file.name, fileError);
        }
      }

      // 2. Delete files from code_files that are no longer in session
      // Get current files in database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingFiles } = await (supabase as any)
        .from("code_files")
        .select("id")
        .eq("project_id", projectId);

      const sessionFileIds = new Set(session.codeFiles.map(f => f.id));
      const filesToDelete = (existingFiles || [])
        .filter((f: { id: string }) => !sessionFileIds.has(f.id))
        .map((f: { id: string }) => f.id);

      if (filesToDelete.length > 0) {
        console.log(`saveProject: Deleting ${filesToDelete.length} orphan files`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("code_files")
          .delete()
          .in("id", filesToDelete);
      }

      // 3. Save annotations to annotations table
      console.log(`saveProject: Saving ${session.lineAnnotations.length} annotations to annotations table`);
      for (const annotation of session.lineAnnotations) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: annotationError } = await (supabase as any)
          .from("annotations")
          .upsert({
            id: annotation.id,
            file_id: annotation.codeFileId,
            project_id: projectId,
            user_id: user.id,
            line_number: annotation.lineNumber,
            end_line_number: annotation.endLineNumber || null,
            line_content: annotation.lineContent || null,
            type: annotation.type,
            content: annotation.content,
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });

        if (annotationError) {
          console.error("saveProject: Error saving annotation", annotation.id, annotationError);
        }
      }

      // 4. Delete annotations that are no longer in session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingAnnotations } = await (supabase as any)
        .from("annotations")
        .select("id")
        .eq("project_id", projectId);

      const sessionAnnotationIds = new Set(session.lineAnnotations.map(a => a.id));
      const annotationsToDelete = (existingAnnotations || [])
        .filter((a: { id: string }) => !sessionAnnotationIds.has(a.id))
        .map((a: { id: string }) => a.id);

      if (annotationsToDelete.length > 0) {
        console.log(`saveProject: Deleting ${annotationsToDelete.length} orphan annotations`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("annotations")
          .delete()
          .in("id", annotationsToDelete);
      }

      // 5. Save session_data WITHOUT codeFiles, codeContents, lineAnnotations
      // These are now in their own tables
      const sessionDataWithoutFiles = {
        ...session,
        codeFiles: [],  // Empty - data is in code_files table
        codeContents: {},  // Empty - data is in code_files table
        lineAnnotations: [],  // Empty - data is in annotations table
      };

      const updateData = {
        session_data: sessionDataWithoutFiles,
        mode: session.mode,
        updated_at: new Date().toISOString(),
      };
      console.log("saveProject: Updating project metadata");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error, data } = await (supabase as any)
        .from("projects")
        .update(updateData)
        .eq("id", projectId)
        .select();

      console.log("saveProject: Result", { error, data });

      if (error) {
        console.error("saveProject: Error", error);
        return { error: new Error(error.message) };
      }

      console.log("saveProject: Success, refreshing projects");
      // Refresh project list to update timestamps
      await fetchProjects();

      return { error: null };
    } catch (error) {
      console.error("saveProject: Exception", error);
      return { error: error as Error };
    }
  }, [supabase, user, fetchProjects]);

  // Delete a project
  const deleteProject = useCallback(async (projectId: string) => {
    if (!supabase) {
      return { error: new Error("Supabase not configured") };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Clear current project if it was deleted
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }

      // Refresh project list
      await fetchProjects();

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase, currentProjectId, fetchProjects]);

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
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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

      // Refresh projects list
      await fetchProjects();

      return { project: project as Project, error: null };
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
