"use client";

/**
 * Library Modal
 *
 * Browse and copy public projects from the library.
 * Projects in the library are approved public projects that can be previewed
 * (read-only) or copied to the user's own projects.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/context/ProjectsContext";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import {
  X,
  Library,
  BookOpen,
  Copy,
  Eye,
  Loader2,
  Clock,
  User,
  Search,
  FileCode,
  CheckCircle,
} from "lucide-react";
import type { LibraryProject } from "@/lib/supabase/types";
import type { EntryMode } from "@/types/session";

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

export function LibraryModal() {
  const router = useRouter();
  const {
    libraryProjects,
    isLoadingLibrary,
    showLibraryModal,
    setShowLibraryModal,
    fetchLibraryProjects,
    loadLibraryProject,
    copyLibraryProject,
    setViewingLibraryProjectId,
  } = useProjects();
  const { importSession, resetSession } = useSession();

  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);

  // Fetch library projects when modal opens
  useEffect(() => {
    if (showLibraryModal) {
      fetchLibraryProjects();
      setError(null);
      setCopiedProjectId(null);
    }
  }, [showLibraryModal, fetchLibraryProjects]);

  if (!showLibraryModal) return null;

  const handleClose = () => {
    setShowLibraryModal(false);
    setSearchQuery("");
    setError(null);
    setCopiedProjectId(null);
  };

  const handlePreview = async (project: LibraryProject) => {
    setActionLoading(`preview-${project.id}`);
    setError(null);

    // Clear any existing preview state first
    setViewingLibraryProjectId(null);

    // Reset current session before loading library project
    resetSession();

    // Load project in read-only mode
    const { session, error } = await loadLibraryProject(project.id);

    if (error) {
      setError(error.message);
      setActionLoading(null);
      return;
    }

    if (session) {
      importSession(session);
      handleClose();
      router.push("/conversation");
    }

    setActionLoading(null);
  };

  const handleCopy = async (project: LibraryProject) => {
    setActionLoading(`copy-${project.id}`);
    setError(null);

    const { project: newProject, error } = await copyLibraryProject(project.id);

    if (error) {
      setError(error.message);
    } else if (newProject) {
      // Show success state briefly
      setCopiedProjectId(project.id);
      setTimeout(() => {
        setCopiedProjectId(null);
      }, 2000);
    }

    setActionLoading(null);
  };

  // Filter projects by search query
  const filteredProjects = libraryProjects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.owner?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
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
      <div className="relative bg-popover rounded-sm shadow-lg border border-parchment max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden modal-content">
        {/* Header */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-cream to-ivory border-b border-parchment">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-burgundy/10 rounded-lg">
              <Library className="h-5 w-5 text-burgundy" />
            </div>
            <div>
              <h2 className="font-serif text-ui-title text-ink">Project Library</h2>
              <p className="font-sans text-ui-xs text-slate">
                Browse and copy published CCS projects
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

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-parchment">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className={cn(
                "w-full pl-9 pr-3 py-2",
                "font-sans text-ui-base text-ink placeholder:text-slate/50",
                "bg-ivory border border-parchment rounded-lg",
                "focus:outline-none focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy"
              )}
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-5 mt-4 px-3 py-2 bg-burgundy/10 border border-burgundy/20 rounded-lg">
            <p className="font-sans text-ui-base text-burgundy">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoadingLibrary ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-burgundy mb-2" />
              <p className="font-sans text-ui-base text-slate">Loading library...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cream to-parchment/50 rounded-2xl mb-4 shadow-sm">
                <BookOpen className="h-7 w-7 text-burgundy/40" />
              </div>
              <h3 className="font-serif text-ui-lg text-ink mb-2">
                {searchQuery ? "No matching projects" : "No projects in library"}
              </h3>
              <p className="font-sans text-ui-xs text-slate max-w-[220px] mx-auto leading-relaxed">
                {searchQuery
                  ? "Try a different search term"
                  : "Approved public projects will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="group p-4 rounded-xl border border-parchment bg-ivory hover:border-parchment-dark hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-ui-base text-ink truncate" title={project.name}>
                        {project.name}
                      </h4>
                      {/* Owner info */}
                      <p className="font-sans text-ui-xs text-slate/60 mb-1 flex items-center gap-1">
                        <User className="h-2.5 w-2.5" />
                        <span>{project.owner?.display_name || "Unknown"}</span>
                        {project.owner?.affiliation && (
                          <span className="text-slate/40">
                            ({project.owner.affiliation})
                          </span>
                        )}
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
                          {formatDate(project.approved_at)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => handlePreview(project)}
                        disabled={!!actionLoading}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                          "font-sans text-ui-xs font-medium",
                          "bg-slate/10 text-slate hover:bg-slate/20",
                          "transition-colors",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {actionLoading === `preview-${project.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        Preview
                      </button>
                      <button
                        onClick={() => handleCopy(project)}
                        disabled={!!actionLoading || copiedProjectId === project.id}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                          "font-sans text-ui-xs font-medium",
                          "transition-colors",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          copiedProjectId === project.id
                            ? "bg-emerald-500 text-white"
                            : "bg-burgundy text-ivory hover:bg-burgundy-dark"
                        )}
                      >
                        {actionLoading === `copy-${project.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : copiedProjectId === project.id ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-parchment bg-cream/30">
          <p className="font-sans text-ui-xs text-slate/70 text-center">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>
    </div>
  );
}
