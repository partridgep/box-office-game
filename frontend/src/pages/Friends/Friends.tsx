import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Loader2, UserPlus } from "lucide-react";
import { useMovieStore } from "../../store/useMovieStore";
import { useUserStore } from "../../store/useUserStore";
import { useFriendsStore } from "../../store/useFriendsStore";
import { getPredictionAvailability } from "../../utils/predictionWindows";
import { formatMillions } from "../../utils/formatMoney";
import {
  followingRivalryCopy,
  formatLastGuessAt,
  friendlyFriendError,
} from "../../components/Friends/friends";
import InviteDialog from "../../components/Friends/InviteDialog";
import { useFriendActivity } from "../../components/Friends/useFriendActivity";

const sectionHeading =
  "text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 mb-3";

/** Same interactive list chrome as Guesses rows. */
const followingShell =
  "divide-y divide-theater-gold/30 rounded-xl border border-theater-gold/35 bg-cinema-900";

const activityShell =
  "divide-y divide-cinema-800/80 rounded-xl border border-cinema-800/80 bg-cinema-900/40";

const POSTER = "https://image.tmdb.org/t/p/w185";

export default function Friends() {
  const user = useUserStore((s) => s.user);
  const sessionStatus = useUserStore((s) => s.sessionStatus);
  const openRestoreAccess = useUserStore((s) => s.openRestoreAccess);
  const movies = useMovieStore((s) => s.movies);
  const { following, followBack, loaded, loadFollowing, follow, unfollow } =
    useFriendsStore();

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

  async function handleFollowBack(short_id: string) {
    setBusyCode(short_id);
    try {
      await follow(short_id);
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
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
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
    <div className="mx-auto mt-2 w-full max-w-4xl space-y-10 text-left md:mt-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-marquee text-4xl uppercase tracking-wide text-theater-gold sm:text-5xl">
          Friends
        </h1>
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
          <ul className={activityShell}>
            {activity.map((item) => {
              const posterSrc = item.poster
                ? `${POSTER}${item.poster}`
                : null;
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <Link
                    to={`/movie/${item.tmdbID}`}
                    aria-label={item.movieTitle}
                    className="h-10 w-7 shrink-0 overflow-hidden rounded bg-cinema-900 ring-1 ring-stone-600/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold"
                  >
                    {posterSrc ? (
                      <img
                        src={posterSrc}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </Link>
                  <span className="min-w-0">
                    {item.short_id ? (
                      <Link
                        to={`/friends/${item.short_id}`}
                        className="font-semibold text-theater-gold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-theater-gold">
                        {item.name}
                      </span>
                    )}
                    {" locked "}
                    {item.domesticOpening != null ? (
                      <span className="font-semibold tabular-nums text-stone-100">
                        {formatMillions(item.domesticOpening)}
                      </span>
                    ) : (
                      "a call"
                    )}
                    {" on "}
                    <Link
                      to={`/movie/${item.tmdbID}`}
                      className="text-stone-200 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold"
                    >
                      {item.movieTitle}
                    </Link>
                  </span>
                </li>
              );
            })}
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
          <ul className={followingShell}>
            {following.map((f) => {
              const rivalry = followingRivalryCopy(
                {
                  shared_count: f.shared_count ?? 0,
                  record: f.record,
                },
                f.name
              );
              const lastCall = formatLastGuessAt(f.last_guess_at);
              const posters = (f.shared_posters ?? []).filter(Boolean).slice(0, 5);
              const rivalryAria = rivalry
                ? [rivalry.shared, rivalry.score].filter(Boolean).join("; ")
                : null;
              return (
                <li
                  key={f.short_id}
                  className="group relative flex items-center gap-3 px-3 py-4 transition-colors hover:bg-theater-gold/5 has-[:focus-visible]:bg-theater-gold/5 sm:gap-6 sm:px-5 sm:py-5"
                >
                  {posters.length > 0 ? (
                    <SharedPosterDeck posters={posters} />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/friends/${f.short_id}`}
                      className="text-base font-semibold text-stone-50 transition-colors duration-150 after:absolute after:inset-0 after:z-0 after:content-[''] group-hover:text-theater-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold motion-reduce:transition-none sm:text-lg"
                      aria-label={
                        [
                          f.name,
                          f.follows_you ? "Mutual" : null,
                          rivalryAria,
                          lastCall,
                        ]
                          .filter(Boolean)
                          .join("; ")
                      }
                    >
                      <span className="relative z-[1] truncate">{f.name}</span>
                    </Link>
                    {f.follows_you ? (
                      <p className="relative z-[1] mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-theater-gold/80 pointer-events-none">
                        Mutual
                      </p>
                    ) : null}
                    {rivalry ? (
                      <p className="relative z-[1] mt-0.5 text-sm text-stone-300 pointer-events-none">
                        <span className="block">{rivalry.shared}</span>
                        {rivalry.score ? (
                          <span className="mt-0.5 block font-medium text-stone-200">
                            {rivalry.score}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    <p className="relative z-[1] mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-stone-500">
                      <span className="uppercase tracking-[0.18em] pointer-events-none">
                        {f.short_id}
                      </span>
                      <span className="text-stone-600 pointer-events-none" aria-hidden>
                        ·
                      </span>
                      <span className="pointer-events-none">{lastCall}</span>
                      <span className="text-stone-600 pointer-events-none" aria-hidden>
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnfollow(f.short_id)}
                        disabled={busyCode === f.short_id}
                        aria-label={`Unfollow ${f.name}`}
                        className="relative z-10 rounded-md py-0.5 text-xs text-stone-400 transition-colors hover:text-cinema-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold disabled:opacity-50"
                      >
                        Unfollow
                      </button>
                    </p>
                  </div>
                  <ChevronRight
                    className="pointer-events-none relative z-[1] h-4 w-4 shrink-0 text-stone-500 transition-colors group-hover:text-theater-gold group-focus-within:text-theater-gold"
                    aria-hidden
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {loaded && followBack.length > 0 ? (
        <section aria-labelledby="friends-follow-back">
          <h2 id="friends-follow-back" className={sectionHeading}>
            Follow back ({followBack.length})
          </h2>
          <ul className={activityShell}>
            {followBack.map((f) => (
              <li
                key={f.short_id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-stone-100">{f.name}</p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    <span className="uppercase tracking-[0.18em]">
                      {f.short_id}
                    </span>
                    <span className="mx-1.5 text-stone-600" aria-hidden>
                      ·
                    </span>
                    Follows you
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFollowBack(f.short_id)}
                  disabled={busyCode === f.short_id}
                  aria-label={`Follow back ${f.name}`}
                  className="inline-flex min-w-[6.5rem] shrink-0 items-center justify-center rounded-lg bg-theater-gold px-3 py-1.5 text-sm font-semibold text-cinema-950 hover:bg-theater-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold disabled:opacity-50"
                >
                  {busyCode === f.short_id ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden />
                  ) : (
                    "Follow back"
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {inviteOpen && <InviteDialog onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

/** Overlapping poster stack; fans from the box center inside a fixed reserved width. */
function SharedPosterDeck({ posters }: { posters: string[] }) {
  const n = posters.length;
  const mid = (n - 1) / 2;
  const slots = Math.max(0, n - 1);
  return (
    <span
      className="relative flex h-14 shrink-0 items-end overflow-visible [--deck-card:2.25rem] [--deck-gap:0.5rem] [--deck-gap-spread:0.9rem] [--deck-fan:3.5] group-hover:[--deck-gap:0.9rem] group-hover:[--deck-fan:11] motion-reduce:group-hover:[--deck-gap:0.5rem] motion-reduce:group-hover:[--deck-fan:3.5] sm:h-16 sm:[--deck-card:2.75rem] sm:[--deck-gap:0.6rem] sm:[--deck-gap-spread:1.05rem] sm:[--deck-fan:4] sm:group-hover:[--deck-gap:1.05rem] sm:group-hover:[--deck-fan:12] sm:motion-reduce:group-hover:[--deck-gap:0.6rem] sm:motion-reduce:group-hover:[--deck-fan:4]"
      style={{
        // Always reserve the spread width so fanning doesn't push sibling text.
        width: `calc(var(--deck-card) + ${slots} * var(--deck-gap-spread))`,
      }}
      aria-hidden
    >
      {posters.map((poster, i) => {
        const src = `${POSTER}${poster}`;
        const step = i - mid;
        return (
          <span
            key={`${poster}-${i}`}
            className="absolute bottom-0 h-14 w-9 origin-bottom overflow-hidden rounded bg-cinema-900 ring-1 ring-cinema-950/80 transition-[left,transform] duration-300 [transition-timing-function:cubic-bezier(0.65, 0, 0.35, 1)] motion-reduce:transition-none sm:h-16 sm:w-11"
            style={{
              // Center the current gap stack in the reserved spread box, then step by gap.
              left: `calc(${slots} * (var(--deck-gap-spread) - var(--deck-gap)) / 2 + ${i} * var(--deck-gap))`,
              zIndex: i + 1,
              transform: `rotate(calc(${step} * var(--deck-fan) * 1deg))`,
            }}
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
          </span>
        );
      })}
    </span>
  );
}
