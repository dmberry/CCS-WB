"use client";

/**
 * Authentication Context for Supabase
 *
 * Provides user authentication state and methods for sign-in/sign-out.
 * When Supabase is not configured, all auth features are gracefully disabled.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import type { Database, Profile, ProfileInsert } from "@/lib/supabase/types";

// Auth provider types
export type AuthProvider = "google" | "github";

interface AuthContextValue {
  // Configuration state
  isSupabaseEnabled: boolean;

  // User state
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Auth methods
  signInWithProvider: (provider: AuthProvider) => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;

  // Profile methods
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;

  // Modal state (controlled by context for easy access)
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const isSupabaseEnabled = isSupabaseConfigured();
  const supabase = isSupabaseEnabled ? getSupabaseClient() : null;

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data;
  }, [supabase]);

  // Create profile if it doesn't exist
  const createProfile = useCallback(async (user: User) => {
    if (!supabase) return null;

    // Generate initials from email or name
    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
    const initials = displayName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const newProfile: ProfileInsert = {
      id: user.id,
      display_name: displayName,
      initials,
      affiliation: null,
      avatar_url: user.user_metadata?.avatar_url || null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("profiles")
      .upsert(newProfile)
      .select()
      .single();

    if (error) {
      console.error("Error creating profile:", error);
      return null;
    }

    return data;
  }, [supabase]);

  // Initialize auth state
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);

          // Fetch or create profile
          let userProfile = await fetchProfile(initialSession.user.id);
          if (!userProfile) {
            userProfile = await createProfile(initialSession.user);
          }
          setProfile(userProfile);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Fetch or create profile on sign in
          let userProfile = await fetchProfile(newSession.user.id);
          if (!userProfile) {
            userProfile = await createProfile(newSession.user);
          }
          setProfile(userProfile);

          // Close login modal on successful sign in
          if (event === "SIGNED_IN") {
            setShowLoginModal(false);
          }
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, createProfile]);

  // Sign in with OAuth provider (Google, GitHub)
  const signInWithProvider = useCallback(async (provider: AuthProvider) => {
    if (!supabase) {
      return { error: new Error("Supabase not configured") as unknown as AuthError };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error };
  }, [supabase]);

  // Sign in with magic link (email)
  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!supabase) {
      return { error: new Error("Supabase not configured") as unknown as AuthError };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error };
  }, [supabase]);

  // Sign out
  const signOut = useCallback(async () => {
    if (!supabase) {
      return { error: new Error("Supabase not configured") as unknown as AuthError };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  }, [supabase]);

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!supabase || !user) {
      return { error: new Error("Not authenticated") };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (!error) {
      // Refresh profile after update
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);
    }

    return { error: error ? new Error(error.message) : null };
  }, [supabase, user, fetchProfile]);

  // Refresh profile from database
  const refreshProfile = useCallback(async () => {
    if (user) {
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);
    }
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        isSupabaseEnabled,
        user,
        profile,
        session,
        isLoading,
        isAuthenticated: !!user,
        signInWithProvider,
        signInWithMagicLink,
        signOut,
        updateProfile,
        refreshProfile,
        showLoginModal,
        setShowLoginModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
