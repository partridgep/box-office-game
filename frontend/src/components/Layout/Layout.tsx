import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Clapperboard, Loader2, Target, UserRound, Users } from "lucide-react";
import { useUserStore } from "../../store/useUserStore";
import { useFriendsStore } from "../../store/useFriendsStore";
import { useGuessStore } from "../../store/useGuessStore";
import { useMovieStore } from "../../store/useMovieStore";
import { joinGuessRows } from "../../pages/Guesses/joinGuessRows";
import { useGuessUpdatesBadgeCount } from "../../pages/Guesses/useGuessUpdates";
import RecoverAccount from "../RecoverAccount/RecoverAccount";
import InviteDialog from "../Friends/InviteDialog";
import BrandMark from "./BrandMark";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: ReactNode;
}

type BottomTab = "upcoming" | "guesses" | "friends" | "you";

const DESKTOP_MQ = "(min-width: 768px)";

function isUpcomingPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/movie");
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(DESKTOP_MQ).matches : true
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const user = useUserStore((state) => state.user);
  const sessionStatus = useUserStore((state) => state.sessionStatus);
  const sessionMessage = useUserStore((state) => state.sessionMessage);
  const restoreAccessOpen = useUserStore((state) => state.restoreAccessOpen);
  const openRestoreAccess = useUserStore((state) => state.openRestoreAccess);
  const closeRestoreAccess = useUserStore((state) => state.closeRestoreAccess);
  const logout = useUserStore((state) => state.logout);

  const [accountOpen, setAccountOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [flickerKey, setFlickerKey] = useState(0);
  const [flickerTab, setFlickerTab] = useState<BottomTab | null>(null);

  const accountMenuId = useId();
  const accountPanelRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const youPanelRef = useRef<HTMLDivElement>(null);
  const youTriggerRef = useRef<HTMLButtonElement>(null);

  const followingCount = useFriendsStore((state) => state.following.length);
  const followingLoaded = useFriendsStore((state) => state.loaded);
  const loadFollowing = useFriendsStore((state) => state.loadFollowing);
  const guesses = useGuessStore((state) => state.guesses);
  const movies = useMovieStore((state) => state.movies);

  const signedIn = sessionStatus === "ready" && Boolean(user);
  const upcomingActive = isUpcomingPath(location.pathname) && !accountOpen;
  const guessesActive = location.pathname.startsWith("/guesses");
  const friendsActive = location.pathname.startsWith("/friends");
  const youActive =
    accountOpen ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/follow");

  const guessRows = useMemo(
    () => joinGuessRows(guesses, movies),
    [guesses, movies]
  );
  const guessesBadgeCount = useGuessUpdatesBadgeCount(
    signedIn ? user?.id : null,
    guessRows
  );

  useEffect(() => {
    if (sessionStatus === "ready" && user && !followingLoaded) {
      loadFollowing().catch(() => {});
    }
  }, [sessionStatus, user, followingLoaded, loadFollowing]);

  // One bulb flicker on the newly active bottom tab after a route change.
  useEffect(() => {
    let tab: BottomTab = "upcoming";
    if (location.pathname.startsWith("/guesses")) {
      tab = "guesses";
    } else if (location.pathname.startsWith("/friends")) {
      tab = "friends";
    } else if (
      location.pathname.startsWith("/admin") ||
      location.pathname.startsWith("/follow")
    ) {
      tab = "you";
    } else if (isUpcomingPath(location.pathname)) {
      tab = "upcoming";
    }
    setFlickerTab(tab);
    setFlickerKey((k) => k + 1);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        accountPanelRef.current?.contains(target) ||
        accountTriggerRef.current?.contains(target) ||
        youPanelRef.current?.contains(target) ||
        youTriggerRef.current?.contains(target)
      ) {
        return;
      }
      setAccountOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  function goUpcoming() {
    setAccountOpen(false);
    navigate("/");
  }

  function goGuesses() {
    setAccountOpen(false);
    navigate("/guesses");
  }

  function goFriends() {
    setAccountOpen(false);
    navigate("/friends");
  }

  function renderGuessesBadge() {
    if (!signedIn || guessesBadgeCount <= 0) return null;
    return (
      <span className="ml-1 tabular-nums text-stone-500">
        {guessesBadgeCount > 9 ? "9+" : guessesBadgeCount}
      </span>
    );
  }

  function toggleAccount() {
    if (!signedIn) {
      openRestoreAccess();
      return;
    }
    setAccountOpen((open) => !open);
  }

  function renderAccountActions(
    panelRef: RefObject<HTMLDivElement>,
    { openUp = false }: { openUp?: boolean } = {}
  ) {
    if (!signedIn || !user) return null;
    return (
      <div
        ref={panelRef}
        id={accountMenuId}
        className={`${styles.accountPanel} ${openUp ? styles.accountPanelUp : ""}`}
        role="menu"
        aria-label="Account"
      >
        <p
          className="px-2.5 py-1.5 text-xs text-stone-500 truncate"
          role="presentation"
        >
          {user.name}
        </p>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setAccountOpen(false);
            setInviteOpen(true);
          }}
        >
          Invite
        </button>
        <Link
          role="menuitem"
          to="/admin"
          onClick={() => setAccountOpen(false)}
        >
          Admin
        </Link>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setAccountOpen(false);
            logout();
          }}
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen overflow-x-hidden overscroll-x-none bg-cinema-950 text-stone-100 flex flex-col selection:bg-cinema-500 selection:text-white ${styles.layout}`}
    >
      <header className={styles.topRail}>
        <button
          type="button"
          className={styles.brandButton}
          onClick={goUpcoming}
          aria-label="Box Office Guesser home"
        >
          <BrandMark className="size-10 shrink-0 md:size-11" />
          <span className={styles.wordmark}>Box Office Guesser</span>
        </button>

        {isDesktop ? (
          <nav className={styles.desktopNav} aria-label="Primary">
            <button
              type="button"
              onClick={goUpcoming}
              className={`${styles.navLink} ${
                location.pathname === "/" ? styles.navLinkActive : ""
              }`}
              aria-current={location.pathname === "/" ? "page" : undefined}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={goGuesses}
              className={`${styles.navLink} ${
                guessesActive ? styles.navLinkActive : ""
              }`}
              aria-current={guessesActive ? "page" : undefined}
            >
              Guesses
              {renderGuessesBadge()}
            </button>
            <button
              type="button"
              onClick={goFriends}
              className={`${styles.navLink} ${
                friendsActive ? styles.navLinkActive : ""
              }`}
              aria-current={friendsActive ? "page" : undefined}
            >
              Friends
              {signedIn && followingLoaded ? (
                <span className="ml-1 tabular-nums text-stone-500">
                  {followingCount}
                </span>
              ) : null}
            </button>
          </nav>
        ) : null}

        <div className={styles.accountCluster}>
          {sessionStatus === "booting" ? (
            <div className={styles.sessionPill} role="status" aria-live="polite">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              <span className="hidden sm:inline">Reconnecting…</span>
            </div>
          ) : null}

          {isDesktop && sessionStatus !== "booting" && signedIn && user ? (
            <div className={styles.accountMenu}>
              <button
                ref={accountTriggerRef}
                type="button"
                className={styles.accountTrigger}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-controls={accountMenuId}
                onClick={toggleAccount}
              >
                <UserRound size={15} aria-hidden />
                <span className={styles.accountName}>{user.name}</span>
              </button>
              {accountOpen ? renderAccountActions(accountPanelRef) : null}
            </div>
          ) : null}

          {isDesktop && sessionStatus !== "booting" && !signedIn ? (
            <button
              type="button"
              onClick={() => openRestoreAccess()}
              className={styles.restoreButton}
            >
              Restore Access
            </button>
          ) : null}
        </div>
      </header>

      {restoreAccessOpen && (
        <RecoverAccount
          message={sessionMessage}
          onClose={closeRestoreAccess}
        />
      )}

      {inviteOpen && signedIn && (
        <InviteDialog onClose={() => setInviteOpen(false)} />
      )}

      <main className={styles.main}>{children}</main>

      {!isDesktop ? (
        <nav className={styles.bottomBar} aria-label="Primary">
          <button
            type="button"
            className={`${styles.bottomItem} ${
              upcomingActive ? styles.bottomItemActive : ""
            }`}
            onClick={goUpcoming}
            aria-current={upcomingActive ? "page" : undefined}
          >
            <span className={styles.bottomIconWrap}>
              <Clapperboard size={20} strokeWidth={1.75} aria-hidden />
              {upcomingActive ? (
                <span
                  key={`upcoming-${flickerKey}`}
                  className={`${styles.bulb} ${
                    flickerTab === "upcoming" ? styles.bulbFlicker : ""
                  }`}
                  aria-hidden
                />
              ) : null}
            </span>
            <span className={styles.bottomLabel}>Upcoming</span>
          </button>

          <button
            type="button"
            className={`${styles.bottomItem} ${
              guessesActive ? styles.bottomItemActive : ""
            }`}
            onClick={goGuesses}
            aria-current={guessesActive ? "page" : undefined}
          >
            <span className={styles.bottomIconWrap}>
              <Target size={20} strokeWidth={1.75} aria-hidden />
              {guessesActive ? (
                <span
                  key={`guesses-${flickerKey}`}
                  className={`${styles.bulb} ${
                    flickerTab === "guesses" ? styles.bulbFlicker : ""
                  }`}
                  aria-hidden
                />
              ) : null}
              {signedIn && guessesBadgeCount > 0 && !guessesActive ? (
                <span className={styles.tabBadge} aria-hidden>
                  {guessesBadgeCount > 9 ? "9+" : guessesBadgeCount}
                </span>
              ) : null}
            </span>
            <span className={styles.bottomLabel}>Guesses</span>
            {signedIn && guessesBadgeCount > 0 ? (
              <span className="sr-only">
                {guessesBadgeCount} update
                {guessesBadgeCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className={`${styles.bottomItem} ${
              friendsActive ? styles.bottomItemActive : ""
            }`}
            onClick={goFriends}
            aria-current={friendsActive ? "page" : undefined}
          >
            <span className={styles.bottomIconWrap}>
              <Users size={20} strokeWidth={1.75} aria-hidden />
              {friendsActive ? (
                <span
                  key={`friends-${flickerKey}`}
                  className={`${styles.bulb} ${
                    flickerTab === "friends" ? styles.bulbFlicker : ""
                  }`}
                  aria-hidden
                />
              ) : null}
            </span>
            <span className={styles.bottomLabel}>Friends</span>
          </button>

          <div className="relative">
            <button
              ref={youTriggerRef}
              type="button"
              className={`${styles.bottomItem} w-full ${
                youActive ? styles.bottomItemActive : ""
              }`}
              onClick={toggleAccount}
              aria-haspopup={signedIn ? "menu" : undefined}
              aria-expanded={signedIn ? accountOpen : undefined}
              aria-controls={signedIn ? accountMenuId : undefined}
            >
              <span className={styles.bottomIconWrap}>
                <UserRound size={20} strokeWidth={1.75} aria-hidden />
                {youActive ? (
                  <span
                    key={`you-${flickerKey}`}
                    className={`${styles.bulb} ${
                      flickerTab === "you" ? styles.bulbFlicker : ""
                    }`}
                    aria-hidden
                  />
                ) : null}
              </span>
              <span className={styles.bottomLabel}>
                {signedIn ? "You" : "Sign in"}
              </span>
            </button>
            {accountOpen && signedIn
              ? renderAccountActions(youPanelRef, { openUp: true })
              : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
