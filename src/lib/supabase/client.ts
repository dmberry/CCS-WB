/**
 * Supabase Browser Client
 *
 * Use this client for browser-side operations (React components, client actions).
 * For server-side operations (API routes, server components), use server.ts instead.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Lazy singleton pattern - client is created on first use
let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Get the Supabase browser client singleton.
 * Returns null if Supabase is not configured (missing environment variables).
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  // Check if already created
  if (supabaseClient) {
    return supabaseClient;
  }

  // Check for required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabase not configured - collaborative features disabled
    return null;
  }

  // Create and cache the client
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

/**
 * Check if Supabase is configured (has required environment variables).
 * Use this to conditionally show collaborative features.
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
