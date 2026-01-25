"use client";

/**
 * Projects Modal
 *
 * Modal for viewing, creating, and managing shared projects.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/context/ProjectsContext";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import {
  X,
  Plus,
  Folder,
  Trash2,
  Loader2,
  Users,
  UserPlus,
  Clock,
  BookOpen,
  Sparkles,
  LogIn,
  LogOut,
  ChevronDown,
  FileText,
  FilePlus2,
  Crown,
} from "lucide-react";
import type { ProjectWithOwner } from "@/lib/supabase/types";
import type { EntryMode, Session } from "@/types/session";
import { ConfirmDialog } from "../shared/ConfirmDialog";

const MODE_LABELS: Record<EntryMode, string> = {
  critique: "Critique",
  archaeology: "Archaeology",
  interpret: "Interpret",
  create: "Create",
};

const MODE_COLORS: Record<EntryMode, string> = {
  critique: "bg-burgundy/10 text-burgundy",
  archaeology: "bg-amber-100 text-amber-700",
  interpret: "bg-blue-100 text-blue-700",
  create: "bg-emerald-100 text-emerald-700",
};

export function ProjectsModal() {
  const router = useRouter();
  const { user } = useAuth();
  const { session, importSession, resetSession } = useSession();
  const {
    projects,
    isLoading,
    currentProjectId,
    showProjectsModal,
    setShowProjectsModal,
    createProject,
    loadProject,
    saveProject,
    deleteProject,
    setCurrentProjectId,
    setShowMembersModal,
    setMembersModalProjectId,
    refreshProjects,
  } = useProjects();

  // Refresh projects when modal opens (handles stale state from Safari suspension)
  useEffect(() => {
    if (showProjectsModal) {
      refreshProjects();
    }
  }, [showProjectsModal, refreshProjects]);

  const [isCreating, setIsCreating] = useState(false);
  const [saveCurrentSession, setSaveCurrentSession] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewProjectMenu, setShowNewProjectMenu] = useState(false);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<ProjectWithOwner | null>(null);

  if (!showProjectsModal) return null;

  const handleClose = () => {
    setShowProjectsModal(false);
    setIsCreating(false);
    setSaveCurrentSession(false);
    setNewProjectName("");
    setNewProjectDescription("");
    setError(null);
    setShowNewProjectMenu(false);
  };

  const handleCreate = async () => {
    if (!newProjectName.trim()) {
      setError("Project name is required");
      return;
    }

    setActionLoading("create");
    setError(null);

    const { project, initialSession, error } = await createProject(
      newProjectName.trim(),
      newProjectDescription.trim() || undefined,
      session.mode
    );

    if (error) {
      setError(error.message);
    } else if (project) {
      if (saveCurrentSession) {
        // Save current session to the new project (overwrites README template)
        await saveProject(project.id, session);
      } else {
        // Use the initialSession returned by createProject (contains README)
        // This avoids a race condition where loadProject might run before DB commits
        console.log("handleCreate: using initialSession", {
          hasSession: !!initialSession,
          fileCount: initialSession?.codeFiles?.length,
          files: initialSession?.codeFiles?.map((f: { name: string }) => f.name),
        });
        if (initialSession) {
          // Cast to Session - importSession will merge with defaults for missing fields
          importSession(initialSession as Session);
        }
      }
      setCurrentProjectId(project.id);
      setIsCreating(false);
      setSaveCurrentSession(false);
      setNewProjectName("");
      setNewProjectDescription("");
      handleClose();
      // Navigate to conversation page to work on the project
      router.push("/conversation");
    }

    setActionLoading(null);
  };

  const handleLoad = async (project: ProjectWithOwner) => {
    setActionLoading(`load-${project.id}`);
    setError(null);

    const { session: loadedSession, error } = await loadProject(project.id);

    if (error) {
      setError(error.message);
    } else if (loadedSession) {
      importSession(loadedSession);
      handleClose();
      // Navigate to conversation page to show the loaded project
      router.push("/conversation");
    }

    setActionLoading(null);
  };

  const handleDeleteClick = (project: ProjectWithOwner) => {
    setDeleteConfirmProject(project);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmProject) return;

    setDeleteConfirmProject(null);
    setActionLoading(`delete-${deleteConfirmProject.id}`);
    setError(null);

    const { error } = await deleteProject(deleteConfirmProject.id);

    if (error) {
      setError(error.message);
    }

    setActionLoading(null);
  };

  const isOwner = (project: ProjectWithOwner) => project.owner_id === user?.id;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-popover rounded-sm shadow-lg border border-parchment max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden modal-content">
        {/* Header */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-cream to-ivory border-b border-parchment">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-burgundy/10 rounded-lg">
              <BookOpen className="h-5 w-5 text-burgundy" />
            </div>
            <div>
              <h2 className="font-serif text-ui-title text-ink">Projects</h2>
              <p className="font-sans text-ui-xs text-slate">
                Save and share your analysis sessions
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-parchment/50 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-slate" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-5 mt-4 px-3 py-2 bg-burgundy/10 border border-burgundy/20 rounded-lg">
            <p className="font-sans text-ui-base text-burgundy">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Create new project form */}
          {isCreating ? (
            <div className="mb-5 p-4 bg-gradient-to-b from-cream/80 to-cream/40 rounded-xl border border-parchment shadow-sm">
              <h3 className="font-serif text-ui-base text-ink mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-burgundy/10 rounded-lg">
                  <Sparkles className="h-3.5 w-3.5 text-burgundy" />
                </div>
                Create New Project
              </h3>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className={cn(
                  "w-full px-3 py-2.5 mb-3",
                  "font-sans text-ui-base text-ink placeholder:text-slate/50",
                  "bg-ivory border border-parchment rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy",
                  "shadow-sm"
                )}
                autoFocus
              />
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Brief description (optional)"
                rows={2}
                className={cn(
                  "w-full px-3 py-2.5 mb-3",
                  "font-sans text-ui-base text-ink placeholder:text-slate/50",
                  "bg-ivory border border-parchment rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy",
                  "resize-none shadow-sm"
                )}
              />

              {/* Show what content will be included */}
              <div className="mb-4 px-3 py-2 bg-cream/50 rounded-lg border border-parchment">
                <p className="font-sans text-ui-xs text-slate">
                  {saveCurrentSession ? (
                    <>
                      <FileText className="inline h-3 w-3 mr-1 text-burgundy" />
                      Will include your current code files and annotations
                    </>
                  ) : (
                    <>
                      <FilePlus2 className="inline h-3 w-3 mr-1 text-burgundy" />
                      Will create an empty project
                    </>
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={actionLoading === "create"}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5",
                    "font-sans text-ui-base font-medium text-ivory",
                    "bg-burgundy rounded-lg hover:bg-burgundy-dark",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all shadow-sm hover:shadow"
                  )}
                >
                  {actionLoading === "create" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setSaveCurrentSession(false);
                    setNewProjectName("");
                    setNewProjectDescription("");
                  }}
                  className={cn(
                    "px-4 py-2.5",
                    "font-sans text-ui-base text-slate",
                    "bg-ivory border border-parchment rounded-lg hover:bg-cream hover:border-parchment-dark",
                    "transition-colors"
                  )}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCreating(true)}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3",
                    "font-sans text-ui-base font-medium text-ivory",
                    "bg-burgundy rounded-xl",
                    "hover:bg-burgundy-dark transition-all shadow-sm hover:shadow"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  New Project
                </button>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={saveCurrentSession}
                      onChange={(e) => setSaveCurrentSession(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={cn(
                      "w-4 h-4 border-2 rounded transition-all",
                      saveCurrentSession
                        ? "bg-burgundy border-burgundy"
                        : "bg-ivory border-parchment-dark group-hover:border-burgundy/50"
                    )}>
                      {saveCurrentSession && (
                        <svg className="w-full h-full text-ivory" viewBox="0 0 16 16" fill="none">
                          <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="font-sans text-ui-xs text-slate group-hover:text-ink transition-colors">
                    populate with current session
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Projects list */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-burgundy mb-2" />
              <p className="font-sans text-ui-base text-slate">Loading projects...</p>
            </div>
          ) : projects.length === 0 && !isCreating ? (
            <div className="text-center py-8 px-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cream to-parchment/50 rounded-2xl mb-4 shadow-sm">
                <Folder className="h-7 w-7 text-burgundy/40" />
              </div>
              <h3 className="font-serif text-ui-lg text-ink mb-2">No projects yet</h3>
              <p className="font-sans text-ui-xs text-slate max-w-[220px] mx-auto leading-relaxed">
                Create a project to save your code analysis and share it with collaborators
              </p>
            </div>
          ) : projects.length === 0 ? null : (
            <div className="space-y-3">
              <p className="font-sans text-ui-xs text-slate uppercase tracking-wide mb-2">
                Your Projects
              </p>
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={cn(
                    "group p-4 rounded-xl border transition-all",
                    currentProjectId === project.id
                      ? "bg-burgundy/5 border-burgundy/30 shadow-sm"
                      : "bg-ivory border-parchment hover:border-parchment-dark hover:shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-ui-base text-ink truncate" title={project.name}>
                        {project.name}
                      </h4>
                      {/* Owner indicator */}
                      <p className="font-sans text-ui-xs text-slate/60 mb-1 flex items-center gap-1">
                        {isOwner(project) ? (
                          <>
                            <Crown className="h-2.5 w-2.5 text-amber-600" />
                            <span>You own this project</span>
                          </>
                        ) : project.owner ? (
                          <>
                            <Users className="h-2.5 w-2.5" />
                            <span>Shared by {project.owner.display_name}</span>
                          </>
                        ) : null}
                      </p>
                      {project.description && (
                        <p className="font-sans text-ui-xs text-slate mb-2 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-ui-xs font-sans font-medium",
                          MODE_COLORS[project.mode as EntryMode] || "bg-slate/10 text-slate"
                        )}>
                          {MODE_LABELS[project.mode as EntryMode] || project.mode}
                        </span>
                        <span className="flex items-center gap-1 text-ui-xs text-slate/60 font-sans">
                          <Clock className="h-3 w-3" />
                          {formatDate(project.updated_at)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {currentProjectId === project.id ? (
                        <button
                          onClick={async () => {
                            // Save before leaving (includes README update)
                            await saveProject(currentProjectId, session);
                            setCurrentProjectId(null);
                            resetSession();
                            handleClose();
                          }}
                          disabled={!!actionLoading}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                            "font-sans text-ui-xs font-medium",
                            "bg-slate/10 text-slate hover:bg-slate/20",
                            "transition-colors",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Leave
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLoad(project)}
                          disabled={!!actionLoading}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                            "font-sans text-ui-xs font-medium",
                            "bg-burgundy text-ivory hover:bg-burgundy-dark",
                            "transition-colors",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          {actionLoading === `load-${project.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <LogIn className="h-3.5 w-3.5" />
                          )}
                          Join
                        </button>
                      )}
                      {/* Members button (owner only) */}
                      {isOwner(project) && (
                        <button
                          onClick={() => {
                            setMembersModalProjectId(project.id);
                            setShowMembersModal(true);
                          }}
                          disabled={!!actionLoading}
                          title="Manage members"
                          className={cn(
                            "p-2 rounded-lg hover:bg-cream transition-colors",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          <UserPlus className="h-4 w-4 text-slate" />
                        </button>
                      )}
                      {/* Delete button (owner only) */}
                      {isOwner(project) && (
                        <button
                          onClick={() => handleDeleteClick(project)}
                          disabled={!!actionLoading}
                          title="Delete project"
                          className={cn(
                            "p-2 rounded-lg hover:bg-burgundy/10 transition-colors",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          {actionLoading === `delete-${project.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin text-burgundy" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-burgundy/60" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-parchment bg-cream/30">
          <p className="font-sans text-ui-xs text-slate/70 text-center flex items-center justify-center gap-1">
            <Users className="h-3 w-3" />
            Projects sync to the cloud for collaboration
          </p>
        </div>
      </div>

      {/* Delete project confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmProject !== null}
        title={`Delete "${deleteConfirmProject?.name}"?`}
        message="This cannot be undone."
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmProject(null)}
      />
    </div>
  );
}
