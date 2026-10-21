import { useEffect, useMemo, useState } from "react";
import { useFriendsStore } from "../../store/useFriendsStore";
import { getAllGuessesForMovie } from "../../services/guesses.service";
import type { Guess, MovieData } from "../../types";

export type FriendActivityItem = {
  id: string;
  name: string;
  movieTitle: string;
  tmdbID: string;
  domesticOpening: number | null;
  updatedAt: string;
};

const DEFAULT_MOVIE_SCAN = 12;

/**
 * Recent friend predictions across open movies (newest first, one chip per friend+title).
 */
export function useFriendActivity(
  movies: MovieData[],
  { limit = 20, movieScan = DEFAULT_MOVIE_SCAN }: { limit?: number; movieScan?: number } = {}
) {
  const following = useFriendsStore((state) => state.following);
  const followingLoaded = useFriendsStore((state) => state.loaded);
  const friendsVersion = useFriendsStore((state) => state.version);
  const [items, setItems] = useState<FriendActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  const movieIdsKey = useMemo(
    () =>
      movies
        .filter((movie) => movie.id)
        .slice(0, movieScan)
        .map((movie) => String(movie.id))
        .join(","),
    [movies, movieScan]
  );

  useEffect(() => {
    if (!followingLoaded || following.length === 0 || !movieIdsKey) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const byId = new Map(
      movies
        .filter((movie) => movie.id)
        .map((movie) => [String(movie.id), movie] as const)
    );
    const ids = movieIdsKey.split(",");

    async function loadActivity() {
      setLoading(true);
      const batches = await Promise.all(
        ids.map(async (id) => {
          try {
            const response = await getAllGuessesForMovie(id);
            return (response.data ?? []).filter((guess) => guess.is_friend);
          } catch {
            return [] as Guess[];
          }
        })
      );
      if (cancelled) return;

      const flat: FriendActivityItem[] = [];
      for (const guess of batches.flat()) {
        const movie = byId.get(String(guess.movie_id));
        if (!movie?.tmdbID) continue;
        flat.push({
          id: guess.id,
          name: guess.guess_user?.name?.trim() || "Friend",
          movieTitle: movie.title,
          tmdbID: String(movie.tmdbID),
          domesticOpening:
            guess.domestic_opening != null &&
            Number.isFinite(Number(guess.domestic_opening))
              ? Number(guess.domestic_opening)
              : null,
          updatedAt: guess.updatedAt || guess.createdAt,
        });
      }

      flat.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      const seen = new Set<string>();
      const unique = flat.filter((item) => {
        const key = `${item.name}:${item.tmdbID}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setItems(unique.slice(0, limit));
      setLoading(false);
    }

    loadActivity();
    return () => {
      cancelled = true;
    };
  }, [
    followingLoaded,
    following.length,
    friendsVersion,
    movieIdsKey,
    movies,
    limit,
  ]);

  return {
    items,
    loading: Boolean(followingLoaded && following.length > 0 && loading),
    followingLoaded,
    followingCount: following.length,
  };
}
