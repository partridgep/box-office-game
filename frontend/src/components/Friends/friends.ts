import { useEffect, useRef, useState } from "react";

export const inviteLinkFor = (code: string) =>
  `${window.location.origin}/follow/${encodeURIComponent(code)}`;

/** "Alex's Guesses" / "James' Guesses". */
export function possessiveGuessesTitle(name: string) {
  const trimmed = name.trim() || "Friend";
  const suffix = /s$/i.test(trimmed) ? "'" : "'s";
  return `${trimmed}${suffix} Guesses`;
}

/** Relative label for last guess activity on the Following list. */
export function formatLastGuessAt(iso: string | null | undefined): string {
  if (!iso) return "No calls yet";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "No calls yet";
  const diffMs = Date.now() - t;
  if (diffMs < 0) return "Just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export type FollowingRivalryCopy = {
  shared: string;
  score: string | null;
};

/** Rivalry summary for Following rows, or null when no overlap. */
export function followingRivalryCopy(
  player: {
    shared_count: number;
    record?: { you: number; them: number; ties: number } | null;
  },
  friendName: string
): FollowingRivalryCopy | null {
  const shared = player.shared_count ?? 0;
  if (shared <= 0) return null;

  const record = player.record ?? { you: 0, them: 0, ties: 0 };
  const scored = record.you + record.them + record.ties;

  return {
    shared: `${shared} you've both guessed`,
    score:
      scored === 0 ? null : `${friendName} ${record.them} – You ${record.you}`,
  };
}

/** Expired or missing JWTs surface as the auth middleware's token/authorization errors. */
export function friendlyFriendError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/token|authorization/i.test(message)) {
    return "Your session has expired. Log out and restore access to manage friends.";
  }
  if (/already|cannot follow yourself/i.test(message)) return message;
  return message || "Something went wrong. Try again.";
}

/** Copy-to-clipboard with a short "Copied" state per key; returns null when the clipboard is blocked. */
export function useCopy(resetMs = 1600) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), resetMs);
      return true;
    } catch {
      return false;
    }
  }

  return { copied, copy };
}
