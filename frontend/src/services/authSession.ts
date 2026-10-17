import type { GuessUser } from "../types";

/** Refresh when the token is missing, expired, or within this window of expiring. */
const REFRESH_WITHIN_MS = 24 * 60 * 60 * 1000;

export interface SessionCredentials {
  name: string;
  access_key: string;
}

export interface SessionRefreshResult {
  user: GuessUser;
  token: string;
}

type SessionHooks = {
  getCredentials: () => SessionCredentials | null;
  onSessionExpired: () => void;
};

let hooks: SessionHooks | null = null;
let refreshInFlight: Promise<SessionRefreshResult> | null = null;

export function configureAuthSession(next: SessionHooks) {
  hooks = next;
}

/** Decode JWT `exp` without verifying — verification stays on the server. */
export function getTokenExpiryMs(token: string): number | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const json = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenFresh(
  token: string | null | undefined,
  withinMs = REFRESH_WITHIN_MS
): boolean {
  if (!token) return false;
  const exp = getTokenExpiryMs(token);
  if (exp == null) return false;
  return exp - Date.now() > withinMs;
}

async function recoverRequest(
  name: string,
  access_key: string
): Promise<SessionRefreshResult> {
  const res = await fetch("/api/users/recover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, access_key }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Recovery failed");
  }
  if (!data?.token || !data?.user) {
    throw new Error("Recovery failed");
  }
  localStorage.setItem("jwt", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return { user: data.user, token: data.token };
}

/**
 * Mint a fresh JWT when the current one is missing, expired, or near expiry.
 * Concurrent callers share one in-flight recover request.
 */
export async function ensureFreshToken(
  creds?: SessionCredentials
): Promise<string> {
  const current = localStorage.getItem("jwt");
  if (isTokenFresh(current)) return current!;

  const resolved = creds ?? hooks?.getCredentials() ?? null;
  if (!resolved?.access_key) {
    throw new Error("No credentials available to refresh session");
  }

  if (!refreshInFlight) {
    refreshInFlight = recoverRequest(resolved.name, resolved.access_key).finally(
      () => {
        refreshInFlight = null;
      }
    );
  }

  const result = await refreshInFlight;
  return result.token;
}

/** After a 401: try one silent recover. Returns true if a new token was stored. */
export async function tryRefreshAfterUnauthorized(): Promise<boolean> {
  try {
    await ensureFreshToken();
    return true;
  } catch {
    hooks?.onSessionExpired();
    return false;
  }
}
