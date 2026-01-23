"use client";

/**
 * User Menu Component
 *
 * Displays user avatar and dropdown menu for authenticated users.
 * Shows sign-in button for unauthenticated users.
 */

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { User, LogOut, Settings, Users, ChevronDown, Loader2 } from "lucide-react";

interface UserMenuProps {
  variant?: "compact" | "full";
  className?: string;
}

export function UserMenu({ variant = "compact", className }: UserMenuProps) {
  const {
    isSupabaseEnabled,
    isAuthenticated,
    isLoading,
    profile,
    setShowLoginModal,
    signOut,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // If Supabase is not enabled, don't render anything
  if (!isSupabaseEnabled) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-slate-muted" />
      </div>
    );
  }

  // Not authenticated - show sign in button
  if (!isAuthenticated) {
    return (
      <button
        onClick={() => setShowLoginModal(true)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5",
          "font-sans text-caption text-slate-muted",
          "hover:text-ink transition-colors",
          "border border-parchment rounded-md hover:border-parchment-dark",
          className
        )}
      >
        <Users className="h-3.5 w-3.5" />
        <span>Collaborate</span>
      </button>
    );
  }

  // Get avatar display (initials or image)
  const avatarUrl = profile?.avatar_url;
  const initials = profile?.initials || profile?.display_name?.slice(0, 2)?.toUpperCase() || "??";
  const displayName = profile?.display_name || "User";

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      {/* Avatar button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2",
          "rounded-md transition-colors",
          variant === "compact" ? "p-1" : "px-2 py-1.5",
          isOpen ? "bg-cream" : "hover:bg-cream"
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-burgundy text-ivory",
            "font-sans text-[10px] font-medium",
            variant === "compact" ? "h-6 w-6" : "h-7 w-7"
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        {/* Name (full variant only) */}
        {variant === "full" && (
          <>
            <span className="font-sans text-caption text-ink max-w-[100px] truncate">
              {displayName}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-slate-muted transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1 z-50",
            "min-w-[180px] py-1",
            "bg-popover rounded-md shadow-editorial-lg border border-parchment"
          )}
        >
          {/* User info header */}
          <div className="px-3 py-2 border-b border-parchment">
            <p className="font-sans text-caption font-medium text-ink truncate">
              {displayName}
            </p>
            {profile?.affiliation && (
              <p className="font-sans text-[10px] text-slate-muted truncate">
                {profile.affiliation}
              </p>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Open profile settings
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5",
                "font-sans text-caption text-ink",
                "hover:bg-cream transition-colors"
              )}
            >
              <User className="h-3.5 w-3.5 text-slate-muted" />
              Profile
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Open account settings
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5",
                "font-sans text-caption text-ink",
                "hover:bg-cream transition-colors"
              )}
            >
              <Settings className="h-3.5 w-3.5 text-slate-muted" />
              Account
            </button>
          </div>

          {/* Sign out */}
          <div className="pt-1 border-t border-parchment">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5",
                "font-sans text-caption text-slate",
                "hover:bg-cream hover:text-ink transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSigningOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
