import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Users } from "lucide-react";
import { useUserStore } from "../../store/useUserStore";
import { useFriendsStore } from "../../store/useFriendsStore";
import FriendsDialog from "../Friends/FriendsDialog";
import RecoverAccount from "../RecoverAccount/RecoverAccount";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserStore((state) => state.user);
  const sessionStatus = useUserStore((state) => state.sessionStatus);
  const sessionMessage = useUserStore((state) => state.sessionMessage);
  const restoreAccessOpen = useUserStore((state) => state.restoreAccessOpen);
  const openRestoreAccess = useUserStore((state) => state.openRestoreAccess);
  const closeRestoreAccess = useUserStore((state) => state.closeRestoreAccess);
  const logout = useUserStore((state) => state.logout);
  const [showingFriends, setShowingFriends] = useState(false);
  const followingCount = useFriendsStore((state) => state.following.length);
  const followingLoaded = useFriendsStore((state) => state.loaded);
  const loadFollowing = useFriendsStore((state) => state.loadFollowing);

  useEffect(() => {
    if (sessionStatus === "ready" && user && !followingLoaded) {
      loadFollowing().catch(() => {});
    }
  }, [sessionStatus, user, followingLoaded, loadFollowing]);

  return (
    <div
      className={`min-h-screen overflow-x-hidden overscroll-x-none bg-cinema-950 text-stone-100 flex flex-col selection:bg-cinema-500 selection:text-white ${styles["layout"]}`}
    >
      <header
        className={`fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-cinema-950/80 px-6 py-4 flex items-center justify-between ${styles["header"]}`}
      >
        <button
          type="button"
          className="flex items-center space-x-3 cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-theater-gold"
          onClick={() => navigate("/")}
        >
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-500 to-rose-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-lg font-black text-white" aria-hidden>
              🎬
            </span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            BoxOffice<span className="text-rose-400">Guesser</span>
          </span>
        </button>

        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => navigate("/")}
            className={`transition-colors ${
              location.pathname === "/" ? "text-rose-400" : "hover:text-white"
            }`}
          >
            Upcoming
          </button>
          <button
            type="button"
            onClick={() => navigate("/leaderboard")}
            className={`transition-colors ${
              location.pathname === "/leaderboard"
                ? "text-rose-400"
                : "hover:text-white"
            }`}
          >
            Leaderboard
          </button>
          <button
            type="button"
            onClick={() => navigate("/challenges")}
            className={`transition-colors ${
              location.pathname === "/challenges"
                ? "text-rose-400"
                : "hover:text-white"
            }`}
          >
            Challenges
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className={`transition-colors ${
              location.pathname.startsWith("/admin")
                ? "text-rose-400"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            Admin
          </button>
        </nav>

        <div className="flex items-center space-x-4">
          {sessionStatus === "booting" ? (
            <div
              className="flex items-center gap-2 bg-cinema-900 px-3 py-1.5 rounded-full text-sm text-stone-400"
              role="status"
              aria-live="polite"
            >
              <Loader2 size={14} className="animate-spin" aria-hidden />
              Reconnecting…
            </div>
          ) : sessionStatus === "ready" && user ? (
            <div className="flex items-center space-x-3 bg-cinema-900 px-3 py-1.5 rounded-full">
              <span className="text-sm font-medium text-slate-200 hidden sm:inline">
                {user.name}
              </span>
              <button
                type="button"
                onClick={() => setShowingFriends(true)}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-stone-300 hover:text-theater-gold focus-visible:outline-2 focus-visible:outline-theater-gold transition-colors"
              >
                <Users size={16} aria-hidden />
                Friends
                {followingLoaded && (
                  <span className="min-w-5 rounded-full bg-cinema-700 px-1.5 text-xs tabular-nums text-stone-200">
                    <span className="sr-only">, following </span>
                    {followingCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={logout}
                className="text-xs text-stone-400 hover:text-rose-400 border-l border-cinema-700 pl-3 transition-colors"
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openRestoreAccess()}
              className="bg-cinema-600 hover:bg-cinema-500 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-lg shadow-cinema-600/30 transition-all"
            >
              Restore Access
            </button>
          )}
        </div>
      </header>

      {restoreAccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cinema-950/80 backdrop-blur-sm p-4">
          <div className="bg-cinema-900 border border-cinema-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <RecoverAccount
              message={sessionMessage}
              onClose={closeRestoreAccess}
            />
          </div>
        </div>
      )}

      {showingFriends && user && sessionStatus === "ready" && (
        <FriendsDialog onClose={() => setShowingFriends(false)} />
      )}

      <main className="pt-18 flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 pb-8">
        {children}
      </main>
    </div>
  );
}
