"use client";

/**
 * Admin Modal
 *
 * Review and approve/reject project submissions to the library.
 * Only visible to users with is_admin = true.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/context/ProjectsContext";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import {
  X,
  Shield,
  BookOpen,
  Check,
  XCircle,
  Eye,
  Loader2,
  Clock,
  User,
  Search,
  FileCode,
  AlertTriangle,
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

export function AdminModal() {
  const router = useRouter();
  const {
    pendingSubmissions,
    isLoadingAdmin,
    showAdminModal,
    setShowAdminModal,
    fetchPendingSubmissions,
    fetchLibraryProjects,
    libraryProjects,
    approveProject,
    rejectProject,
    loadProject,
  } = useProjects();
  const { importSession, resetSession } = useSession();

  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending submissions and library projects when modal opens
  useEffect(() => {
    if (showAdminModal) {
      fetchPendingSubmissions();
      fetchLibraryProjects(); // Fetch library to check for duplicate names
      setError(null);
    }
  }, [showAdminModal, fetchPendingSubmissions, fetchLibraryProjects]);

  // Check if a submission name matches an existing library project
  const getMatchingLibraryProject = (name: string) => {
    // Strip $ prefix from library project names for comparison
    const normalizedName = name.toLowerCase().trim();
    return libraryProjects.find(lp => {
      const libraryName = lp.name.startsWith("$") ? lp.name.slice(1) : lp.name;
      return libraryName.toLowerCase().trim() === normalizedName;
    });
  };

  if (!showAdminModal) return null;

  const handleClose = () => {
    setShowAdminModal(false);
    setSearchQuery("");
    setError(null);
  };

  const handlePreview = async (project: LibraryProject) => {
    setActionLoading(`preview-${project.id}`);
    setError(null);

    // Reset current session before loading
    resetSession();

    // Use loadProject directly - admin RLS allows viewing submitted projects
    const { session, error: loadError } = await loadProject(project.id);

    if (loadError) {
      setError("Preview not available for this project");
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

  const handleApprove = async (project: LibraryProject) => {
    setActionLoading(`approve-${project.id}`);
    setError(null);

    const { error } = await approveProject(project.id);

    if (error) {
      setError(error.message);
    }

    setActionLoading(null);
  };

  const handleReject = async (project: LibraryProject) => {
    setActionLoading(`reject-${project.id}`);
    setError(null);

    const { error } = await rejectProject(project.id);

    if (error) {
      setError(error.message);
    }

    setActionLoading(null);
  };

  // Filter projects by search query
  const filteredProjects = pendingSubmissions.filter(project =>
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
        <div className="relative px-5 py-4 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-parchment">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-serif text-ui-title text-ink">Admin: Review Submissions</h2>
              <p className="font-sans text-ui-xs text-slate">
                Approve or reject projects for the library
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
              placeholder="Search submissions..."
              className={cn(
                "w-full pl-9 pr-3 py-2",
                "font-sans text-ui-base text-ink placeholder:text-slate/50",
                "bg-ivory border border-parchment rounded-lg",
                "focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
          {isLoadingAdmin ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600 mb-2" />
              <p className="font-sans text-ui-base text-slate">Loading submissions...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl mb-4 shadow-sm">
                <BookOpen className="h-7 w-7 text-amber-600/40" />
              </div>
              <h3 className="font-serif text-ui-lg text-ink mb-2">
                {searchQuery ? "No matching submissions" : "No pending submissions"}
              </h3>
              <p className="font-sans text-ui-xs text-slate max-w-[220px] mx-auto leading-relaxed">
                {searchQuery
                  ? "Try a different search term"
                  : "All submissions have been reviewed"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="group p-4 rounded-xl border border-parchment bg-ivory hover:border-amber-300 hover:shadow-sm transition-all"
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
                          Submitted {formatDate(project.submitted_at)}
                        </span>
                        {/* Warning if this matches an existing library project */}
                        {getMatchingLibraryProject(project.name) && (
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-ui-xs font-sans font-medium bg-amber-100 text-amber-700"
                            title={`Matches existing library project: ${getMatchingLibraryProject(project.name)?.name}`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Update?
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => handleApprove(project)}
                        disabled={!!actionLoading}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                          "font-sans text-ui-xs font-medium",
                          "bg-emerald-500 text-white hover:bg-emerald-600",
                          "transition-colors",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {actionLoading === `approve-${project.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(project)}
                        disabled={!!actionLoading}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                          "font-sans text-ui-xs font-medium",
                          "bg-slate/10 text-slate hover:bg-burgundy/10 hover:text-burgundy",
                          "transition-colors",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {actionLoading === `reject-${project.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-parchment bg-amber-50/30">
          <p className="font-sans text-ui-xs text-slate/70 text-center">
            {pendingSubmissions.length} submission{pendingSubmissions.length !== 1 ? "s" : ""} pending review
          </p>
        </div>
      </div>
    </div>
  );
}
