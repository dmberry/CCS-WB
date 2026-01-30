/**
 * Hook for library ratings and favorites
 * Handles like/favorite functionality and 5-star rating system
 */

import { useCallback } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { handleProjectError } from "@/lib/projects-utils";

export interface LibraryRatingsParams {
  supabase: SupabaseClient | null;
  user: User | null;
}

export interface EngagementStats {
  favorite_count: number;
  is_favorited_by_user: boolean;
  average_rating: number | null;
  rating_count: number;
  user_rating: number | null;
}

export interface LibraryRatingsState {
  // Favorites
  toggleFavorite: (projectId: string) => Promise<{ error: Error | null }>;

  // Ratings
  setRating: (projectId: string, rating: number) => Promise<{ error: Error | null }>;
  deleteRating: (projectId: string) => Promise<{ error: Error | null }>;

  // Fetch engagement stats for projects
  fetchEngagementStats: (projectIds: string[]) => Promise<{
    stats: Map<string, EngagementStats>;
    error: Error | null;
  }>;
}

/**
 * Custom hook for library ratings operations
 */
export function useLibraryRatings({
  supabase,
  user,
}: LibraryRatingsParams): LibraryRatingsState {
  // Toggle favorite (add if doesn't exist, remove if exists)
  const toggleFavorite = useCallback(
    async (projectId: string) => {
      if (!supabase || !user) {
        return { error: new Error("Not authenticated") };
      }

      try {
        // Check if favorite already exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing, error: checkError } = await (supabase as any)
          .from("project_favorites")
          .select("id")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (checkError) {
          return { error: new Error(checkError.message) };
        }

        if (existing) {
          // Remove favorite
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: deleteError } = await (supabase as any)
            .from("project_favorites")
            .delete()
            .eq("id", existing.id);

          if (deleteError) {
            return { error: new Error(deleteError.message) };
          }
        } else {
          // Add favorite
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: insertError } = await (supabase as any)
            .from("project_favorites")
            .insert({
              project_id: projectId,
              user_id: user.id,
            });

          if (insertError) {
            return { error: new Error(insertError.message) };
          }
        }

        return { error: null };
      } catch (error) {
        return { error: handleProjectError(error, "toggleFavorite") };
      }
    },
    [supabase, user]
  );

  // Set or update rating (uses UPSERT pattern)
  const setRating = useCallback(
    async (projectId: string, rating: number) => {
      if (!supabase || !user) {
        return { error: new Error("Not authenticated") };
      }

      if (rating < 1 || rating > 5) {
        return { error: new Error("Rating must be between 1 and 5") };
      }

      try {
        const now = new Date().toISOString();

        // Upsert rating (insert or update if exists)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("project_ratings")
          .upsert(
            {
              project_id: projectId,
              user_id: user.id,
              rating: rating,
              updated_at: now,
            },
            {
              onConflict: "project_id,user_id",
            }
          );

        if (error) {
          return { error: new Error(error.message) };
        }

        return { error: null };
      } catch (error) {
        return { error: handleProjectError(error, "setRating") };
      }
    },
    [supabase, user]
  );

  // Delete rating
  const deleteRating = useCallback(
    async (projectId: string) => {
      if (!supabase || !user) {
        return { error: new Error("Not authenticated") };
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("project_ratings")
          .delete()
          .eq("project_id", projectId)
          .eq("user_id", user.id);

        if (error) {
          return { error: new Error(error.message) };
        }

        return { error: null };
      } catch (error) {
        return { error: handleProjectError(error, "deleteRating") };
      }
    },
    [supabase, user]
  );

  // Fetch engagement statistics for multiple projects in batch
  const fetchEngagementStats = useCallback(
    async (projectIds: string[]) => {
      if (!supabase || projectIds.length === 0) {
        return { stats: new Map(), error: null };
      }

      try {
        // Batch size limit
        const batchSize = 50;
        const batches = [];
        for (let i = 0; i < projectIds.length; i += batchSize) {
          batches.push(projectIds.slice(i, i + batchSize));
        }

        const allStats = new Map<string, EngagementStats>();

        for (const batch of batches) {
          // Fetch favorites count and user's favorites in parallel
          const [favoritesResult, userFavoritesResult, ratingsResult, userRatingsResult] =
            await Promise.all([
              // Count favorites per project
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (supabase as any)
                .from("project_favorites")
                .select("project_id")
                .in("project_id", batch),

              // Check which projects user has favorited
              user
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (supabase as any)
                    .from("project_favorites")
                    .select("project_id")
                    .in("project_id", batch)
                    .eq("user_id", user.id)
                : Promise.resolve({ data: [], error: null }),

              // Get ratings (avg and count) per project
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (supabase as any)
                .from("project_ratings")
                .select("project_id, rating")
                .in("project_id", batch),

              // Get user's ratings
              user
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (supabase as any)
                    .from("project_ratings")
                    .select("project_id, rating")
                    .in("project_id", batch)
                    .eq("user_id", user.id)
                : Promise.resolve({ data: [], error: null }),
            ]);

          if (favoritesResult.error) throw favoritesResult.error;
          if (userFavoritesResult.error) throw userFavoritesResult.error;
          if (ratingsResult.error) throw ratingsResult.error;
          if (userRatingsResult.error) throw userRatingsResult.error;

          // Count favorites per project
          const favoriteCounts = new Map<string, number>();
          (favoritesResult.data || []).forEach(
            (fav: { project_id: string }) => {
              favoriteCounts.set(fav.project_id, (favoriteCounts.get(fav.project_id) || 0) + 1);
            }
          );

          // Track user's favorites
          const userFavorites = new Set(
            (userFavoritesResult.data || []).map((fav: { project_id: string }) => fav.project_id)
          );

          // Calculate rating statistics per project
          const ratingStats = new Map<
            string,
            { sum: number; count: number; average: number }
          >();
          (ratingsResult.data || []).forEach(
            (rating: { project_id: string; rating: number }) => {
              const current = ratingStats.get(rating.project_id) || {
                sum: 0,
                count: 0,
                average: 0,
              };
              current.sum += rating.rating;
              current.count += 1;
              current.average = current.sum / current.count;
              ratingStats.set(rating.project_id, current);
            }
          );

          // Track user's ratings
          const userRatings = new Map<string, number>();
          (userRatingsResult.data || []).forEach(
            (rating: { project_id: string; rating: number }) => {
              userRatings.set(rating.project_id, rating.rating);
            }
          );

          // Combine stats for each project
          batch.forEach((projectId) => {
            const stats: EngagementStats = {
              favorite_count: favoriteCounts.get(projectId) || 0,
              is_favorited_by_user: userFavorites.has(projectId),
              average_rating: ratingStats.get(projectId)?.average || null,
              rating_count: ratingStats.get(projectId)?.count || 0,
              user_rating: userRatings.get(projectId) || null,
            };
            allStats.set(projectId, stats);
          });
        }

        return { stats: allStats, error: null };
      } catch (error) {
        return {
          stats: new Map(),
          error: handleProjectError(error, "fetchEngagementStats"),
        };
      }
    },
    [supabase, user]
  );

  return {
    toggleFavorite,
    setRating,
    deleteRating,
    fetchEngagementStats,
  };
}
