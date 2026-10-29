import { flushSync } from "react-dom";
import type { NavigateFunction } from "react-router-dom";

const NAV_ATTR = "data-theater-nav";
const LOBBY_SCROLL_KEY = "bog:lobby-scroll-y";
const LOBBY_MOVIE_KEY = "bog:lobby-movie-id";
const LOBBY_HERO_INDEX_KEY = "bog:lobby-hero-index";

/** Router location.state — survives Strict Mode remounts. */
export const RESTORE_SCROLL_STATE = "restoreScrollY";
export const RESTORE_MOVIE_STATE = "restoreMovieId";

export type TheaterLocationState = {
  /** Absolute window scroll Y at enter — `0` is valid (hero). */
  [RESTORE_SCROLL_STATE]?: number;
  [RESTORE_MOVIE_STATE]?: string;
};

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Keep the browser from resetting scroll on SPA navigations. */
export function disableBrowserScrollRestoration() {
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
}

/** True on a full document reload (not an SPA soft nav). */
export function isDocumentReload() {
  const nav = performance.getEntriesByType(
    "navigation"
  )[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}

/**
 * Full document boot only (call from main). Drops stale lobby restore keys from
 * history.state (they survive refresh) and forces top — including late browser
 * restore after content height grows.
 */
export function resetScrollOnDocumentLoad() {
  const state = history.state;
  if (state && typeof state === "object") {
    const record = state as Record<string, unknown>;
    if (
      RESTORE_SCROLL_STATE in record ||
      RESTORE_MOVIE_STATE in record
    ) {
      const next = { ...record };
      delete next[RESTORE_SCROLL_STATE];
      delete next[RESTORE_MOVIE_STATE];
      history.replaceState(
        Object.keys(next).length > 0 ? next : null,
        ""
      );
    }
  }

  const toTop = () => window.scrollTo(0, 0);
  toTop();
  window.addEventListener("load", toTop, { once: true });
  window.addEventListener("pageshow", toTop);
}

/** `null` = nothing stored; `0` = hero / top of lobby. */
export function readStoredScroll(): number | null {
  try {
    const raw = sessionStorage.getItem(LOBBY_SCROLL_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

function writeStoredScroll(y: number) {
  const next = Math.max(0, Math.round(y));
  try {
    sessionStorage.setItem(LOBBY_SCROLL_KEY, String(next));
  } catch {
    /* private mode / quota */
  }
  return next;
}

function readStoredMovieId() {
  try {
    return sessionStorage.getItem(LOBBY_MOVIE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeStoredMovieId(id: string) {
  try {
    if (id) sessionStorage.setItem(LOBBY_MOVIE_KEY, id);
    else sessionStorage.removeItem(LOBBY_MOVIE_KEY);
  } catch {
    /* ignore */
  }
}

/** Persist hero carousel slide so remount can reopen the same slide. */
export function writeStoredHeroIndex(index: number) {
  const next = Math.max(0, Math.round(index));
  try {
    sessionStorage.setItem(LOBBY_HERO_INDEX_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Drop saved slide (e.g. left lobby from a shelf card, not the hero). */
export function clearStoredHeroIndex() {
  try {
    sessionStorage.removeItem(LOBBY_HERO_INDEX_KEY);
  } catch {
    /* ignore */
  }
}

/** `null` if unset / invalid. */
export function readStoredHeroIndex(): number | null {
  try {
    const raw = sessionStorage.getItem(LOBBY_HERO_INDEX_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  } catch {
    return null;
  }
}

function movieIdFromPath(to: string) {
  return to.match(/\/movie\/([^/?#]+)/)?.[1] ?? "";
}

function setNavDirection(direction: "enter") {
  document.documentElement.setAttribute(NAV_ATTR, direction);
}

function clearNavDirection() {
  document.documentElement.removeAttribute(NAV_ATTR);
}

function resolveScrollY(scrollY?: number | null): number | null {
  if (typeof scrollY === "number" && scrollY >= 0 && Number.isFinite(scrollY)) {
    return Math.round(scrollY);
  }
  return readStoredScroll();
}

function canScrollTo(y: number) {
  if (y === 0) return true;
  const max = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );
  return max >= y * 0.85;
}

/** Restore exact window scroll from enter. Returns false if the page is still too short. */
export function restoreLobbyPosition(scrollY?: number | null) {
  const y = resolveScrollY(scrollY);
  if (y == null) return false;
  if (!canScrollTo(y)) return false;
  window.scrollTo(0, y);
  return true;
}

/** True when window scroll is already near the saved Y. */
export function isNearLobbyRestore(scrollY?: number | null) {
  const y = resolveScrollY(scrollY);
  if (y == null) return false;
  return Math.abs(window.scrollY - y) < 80;
}

/**
 * Lobby → movie details. Root View Transition fade; scroll-to-top after finish.
 */
export function enterTheater(to: string, navigate: NavigateFunction) {
  writeStoredMovieId(movieIdFromPath(to));
  writeStoredScroll(window.scrollY);

  const go = () => {
    flushSync(() => navigate(to));
  };

  const after = () => {
    window.scrollTo(0, 0);
    clearNavDirection();
  };

  if (!document.startViewTransition || prefersReducedMotion()) {
    go();
    after();
    return;
  }

  setNavDirection("enter");
  const transition = document.startViewTransition(go);
  void transition.finished.then(after, after);
}

/**
 * Movie details → lobby. Instant (no VT). CinemaLobby restores scroll after paint.
 */
export function exitTheater(navigate: NavigateFunction, to = "/") {
  const restoreScrollY = readStoredScroll();
  const restoreMovieId = readStoredMovieId();
  const state: TheaterLocationState = {
    ...(restoreScrollY != null
      ? { [RESTORE_SCROLL_STATE]: restoreScrollY }
      : {}),
    [RESTORE_MOVIE_STATE]: restoreMovieId || undefined,
  };
  navigate(to, { state });
}
