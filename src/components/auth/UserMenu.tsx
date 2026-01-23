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
import { User, LogOut, Settings, Users, Loader2 } from "lucide-react";

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className }: UserMenuProps) {
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
      <div className={cn("flex items-center", className)}>
        <Loader2 className="h-3 w-3 animate-spin text-slate" />
      </div>
    );
  }

  // Not authenticated - show sign in button
  if (!isAuthenticated) {
    return (
      <button
        onClick={() => setShowLoginModal(true)}
        className={cn(
          "flex items-center gap-1 px-1.5 py-0.5",
          "font-sans text-[10px] text-slate",
          "hover:text-ink transition-colors",
          "border border-parchment rounded hover:border-parchment-dark",
          className
        )}
      >
        <Users className="h-3 w-3" />
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
          "flex items-center rounded transition-colors p-0.5",
          isOpen ? "bg-cream" : "hover:bg-cream"
        )}
        title={displayName}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-burgundy text-ivory",
            "font-sans text-[8px] font-medium h-5 w-5"
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
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1 z-50",
            "min-w-[140px] py-0.5",
            "bg-card rounded shadow-lg border border-parchment"
          )}
        >
          {/* User info header */}
          <div className="px-2 py-1.5 border-b border-parchment">
            <p className="font-sans text-[11px] font-medium text-ink truncate">
              {displayName}
            </p>
            {profile?.affiliation && (
              <p className="font-sans text-[9px] text-slate truncate">
                {profile.affiliation}
              </p>
            )}
          </div>

          {/* Menu items */}
          <div className="py-0.5">
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Open profile settings
              }}
              className={cn(
                "w-full flex items-center gap-1.5 px-2 py-1",
                "font-sans text-[10px] text-ink",
                "hover:bg-cream transition-colors"
              )}
            >
              <User className="h-3 w-3 text-slate" />
              Profile
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Open account settings
              }}
              className={cn(
                "w-full flex items-center gap-1.5 px-2 py-1",
                "font-sans text-[10px] text-ink",
                "hover:bg-cream transition-colors"
              )}
            >
              <Settings className="h-3 w-3 text-slate" />
              Account
            </button>
          </div>

          {/* Sign out */}
          <div className="pt-0.5 border-t border-parchment">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={cn(
                "w-full flex items-center gap-1.5 px-2 py-1",
                "font-sans text-[10px] text-slate",
                "hover:bg-cream hover:text-ink transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSigningOut ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <LogOut className="h-3 w-3" />
              )}
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
