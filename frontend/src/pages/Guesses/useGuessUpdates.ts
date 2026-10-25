import { useCallback, useEffect, useMemo, useState } from "react";
import type { GuessMovieRow } from "./guessUpdates";
import {
  countGuessUpdateEvents,
  deriveGuessUpdateEvents,
  loadGuessUpdatesSeen,
  markEventsSeen,
  saveGuessUpdatesSeen,
  seedTallyBaselines,
  subscribeGuessUpdatesSeen,
  type GuessUpdateEvent,
  type GuessUpdatesSeenState,
} from "./guessUpdates";

const DISPLAY_LIMIT = 15;

/**
 * Client-derived guess updates + localStorage seen state for a signed-in user.
 */
export function useGuessUpdates(
  userId: string | null | undefined,
  rows: GuessMovieRow[]
) {
  const [seen, setSeen] = useState<GuessUpdatesSeenState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!userId) {
      setSeen({});
      setHydrated(false);
      return;
    }
    const loaded = loadGuessUpdatesSeen(userId);
    const seeded = seedTallyBaselines(rows, loaded);
    if (seeded !== loaded) {
      saveGuessUpdatesSeen(userId, seeded);
    }
    setSeen(seeded);
    setHydrated(true);
    // Seed with rows available at user sign-in; further row arrivals handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId || !hydrated) return;
    setSeen((prev) => {
      const seeded = seedTallyBaselines(rows, prev);
      if (seeded === prev) return prev;
      saveGuessUpdatesSeen(userId, seeded);
      return seeded;
    });
  }, [userId, hydrated, rows]);

  const events = useMemo(() => {
    if (!userId || !hydrated) return [] as GuessUpdateEvent[];
    return deriveGuessUpdateEvents(rows, seen, { limit: DISPLAY_LIMIT });
  }, [userId, hydrated, rows, seen]);

  const unseenCount = useMemo(() => {
    if (!userId || !hydrated) return 0;
    return countGuessUpdateEvents(rows, seen);
  }, [userId, hydrated, rows, seen]);

  const rowsByMovieId = useMemo(() => {
    const map = new Map<string, GuessMovieRow>();
    for (const row of rows) {
      if (row.movie.id) map.set(String(row.movie.id), row);
    }
    return map;
  }, [rows]);

  const dismissEvent = useCallback(
    (event: GuessUpdateEvent) => {
      setSeen((prev) => {
        const next = markEventsSeen(prev, [event], rowsByMovieId);
        if (userId) saveGuessUpdatesSeen(userId, next);
        return next;
      });
    },
    [userId, rowsByMovieId]
  );

  const markVisibleSeen = useCallback(() => {
    setSeen((prev) => {
      const visible = deriveGuessUpdateEvents(rows, prev, {
        limit: DISPLAY_LIMIT,
      });
      if (visible.length === 0) return prev;
      const next = markEventsSeen(prev, visible, rowsByMovieId);
      if (userId) saveGuessUpdatesSeen(userId, next);
      return next;
    });
  }, [userId, rows, rowsByMovieId]);

  return {
    events,
    unseenCount,
    hydrated,
    dismissEvent,
    markVisibleSeen,
  };
}

/** Lightweight unread count for the Guesses nav badge. */
export function useGuessUpdatesBadgeCount(
  userId: string | null | undefined,
  rows: GuessMovieRow[]
) {
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeGuessUpdatesSeen(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }
    const loaded = loadGuessUpdatesSeen(userId);
    const seeded = seedTallyBaselines(rows, loaded);
    if (seeded !== loaded) {
      saveGuessUpdatesSeen(userId, seeded);
    }
    setCount(countGuessUpdateEvents(rows, seeded));
  }, [userId, rows, tick]);

  return count;
}
