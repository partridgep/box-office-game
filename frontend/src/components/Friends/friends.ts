import { useEffect, useRef, useState } from "react";

export const inviteLinkFor = (code: string) =>
  `${window.location.origin}/follow/${encodeURIComponent(code)}`;

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
