import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { useMovieStore } from "../../store/useMovieStore";
import { useUserStore } from "../../store/useUserStore";
import { useFriendsStore } from "../../store/useFriendsStore";
import { getPredictionAvailability } from "../../utils/predictionWindows";
import { formatMillions } from "../../utils/formatMoney";
import { friendlyFriendError } from "../../components/Friends/friends";
import InviteDialog from "../../components/Friends/InviteDialog";
import { useFriendActivity } from "../../components/Friends/useFriendActivity";
const sectionHeading =
  "text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 mb-3";

export default function Friends() {
  const user = useUserStore((s) => s.user);
  const sessionStatus = useUserStore((s) => s.sessionStatus);
  const openRestoreAccess = useUserStore((s) => s.openRestoreAccess);
  const movies = useMovieStore((s) => s.movies);
  const { following, loaded, loadFollowing, unfollow } = useFriendsStore();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [listError, setListError] = useState("");

  const signedIn = sessionStatus === "ready" && Boolean(user);

  const movieList = useMemo(() => {
    const rawList = Array.isArray(movies) ? movies : Object.values(movies);
    return rawList
      .filter((movie) => getPredictionAvailability(movie).anyOpen)
      .sort((a, b) => {
        const aTime = a.released ? new Date(a.released).getTime() : 0;
        const bTime = b.released ? new Date(b.released).getTime() : 0;
        return aTime - bTime;
      });
  }, [movies]);

  const { items: activity, loading: activityLoading } = useFriendActivity(
    movieList,
    { limit: 24, movieScan: 16 }
  );

  useEffect(() => {
    if (!signedIn || loaded) return;
    loadFollowing().catch((err) => setListError(friendlyFriendError(err)));
  }, [signedIn, loaded, loadFollowing]);

  async function handleUnfollow(short_id: string) {
    setBusyCode(short_id);
    try {
      await unfollow(short_id);
    } catch (err) {
      setListError(friendlyFriendError(err));
    } finally {
      setBusyCode(null);
    }
  }

  if (sessionStatus === "booting") {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-stone-400">
        <Loader2 size={18} className="animate-spin" aria-hidden />
        Reconnecting…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center space-y-4">
        <h1 className="font-marquee text-4xl uppercase tracking-wide text-theater-gold">
          Friends
        </h1>
        <p className="text-stone-400">
          Sign in to follow players and see their calls.
        </p>
        <button
          type="button"
          onClick={() => openRestoreAccess()}
          className="inline-flex items-center justify-center rounded-lg bg-theater-gold px-4 py-2 text-sm font-semibold text-cinema-950 hover:bg-theater-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold"
        >
          Restore Access
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10 text-left">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-marquee text-4xl uppercase tracking-wide text-theater-gold sm:text-5xl">
            Friends
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            See what your circle called — and invite more players in.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-theater-gold px-4 py-2 text-sm font-semibold text-cinema-950 hover:bg-theater-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold"
        >
          <UserPlus size={16} aria-hidden />
          Invite
        </button>
      </header>

      <section aria-labelledby="friends-activity">
        <h2 id="friends-activity" className={sectionHeading}>
          Activity
        </h2>
        {activityLoading ? (
          <p className="inline-flex items-center gap-2 text-sm text-stone-400">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            Loading activity…
          </p>
        ) : activity.length === 0 ? (
          <p className="rounded-xl border border-cinema-800/80 bg-cinema-900/40 px-4 py-5 text-sm text-stone-400">
            {following.length === 0
              ? "No friends yet. Invite someone to start comparing calls."
              : "No recent friend predictions on upcoming titles."}
          </p>
        ) : (
          <ul className="divide-y divide-cinema-800/80 rounded-xl border border-cinema-800/80 bg-cinema-900/40">
            {activity.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/movie/${item.tmdbID}`}
                  className="flex flex-col gap-0.5 px-4 py-3 text-sm transition-colors hover:bg-cinema-800/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-theater-gold"
                >
                  <span>
                    <span className="font-semibold text-theater-gold">
                      {item.name}
                    </span>
                    {" locked "}
                    {item.domesticOpening != null ? (
                      <span className="font-semibold tabular-nums text-stone-100">
                        {formatMillions(item.domesticOpening)}
                      </span>
                    ) : (
                      "a call"
                    )}
                    {" on "}
                    <span className="text-stone-200">{item.movieTitle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="friends-following">
        <h2 id="friends-following" className={sectionHeading}>
          Following{loaded ? ` (${following.length})` : ""}
        </h2>
        {listError ? (
          <p className="text-sm text-cinema-200">{listError}</p>
        ) : !loaded ? (
          <p className="inline-flex items-center gap-2 text-sm text-stone-400">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            Loading…
          </p>
        ) : following.length === 0 ? (
          <p className="rounded-xl border border-cinema-800/80 bg-cinema-900/40 px-4 py-5 text-sm text-stone-400">
            You&apos;re not following anyone yet.{" "}
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="text-theater-gold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-theater-gold"
            >
              Invite a friend
            </button>
            .
          </p>
        ) : (
          <ul className="divide-y divide-cinema-800/80 rounded-xl border border-cinema-800/80 bg-cinema-900/40">
            {following.map((f) => (
              <li
                key={f.short_id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-stone-100">
                    {f.name}
                  </span>
                  <span className="block text-xs uppercase tracking-[0.2em] text-stone-500">
                    {f.short_id}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleUnfollow(f.short_id)}
                  disabled={busyCode === f.short_id}
                  aria-label={`Unfollow ${f.name}`}
                  className="text-xs text-stone-400 hover:text-cinema-200 rounded-md px-2 py-1 focus-visible:outline-2 focus-visible:outline-theater-gold disabled:opacity-50"
                >
                  Unfollow
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {inviteOpen && <InviteDialog onClose={() => setInviteOpen(false)} />}
    </div>
  );
}
