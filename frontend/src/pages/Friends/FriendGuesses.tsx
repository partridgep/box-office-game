import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { useUserStore } from "../../store/useUserStore";
import { useFriendsStore } from "../../store/useFriendsStore";
import { useGuessStore } from "../../store/useGuessStore";
import { useMovieStore } from "../../store/useMovieStore";
import type { Guess } from "../../types";
import {
  FriendGuessesAccessError,
  FriendPreview,
  getGuessesByCode,
} from "../../services/users.service";
import { friendlyFriendError } from "../../components/Friends/friends";
import PlayerPreview from "../../components/Friends/PlayerPreview";
import { resolveRunPhaseLocal, RUN_PHASE_SECTION } from "../../utils/runPhase";
import {
  buildFriendRivalry,
  duelMissAria,
  duelOutcomeLabel,
  formatAvgMiss,
  type SharedMovieDuel,
} from "./friendRivalry";
import { RivalryScorecard } from "./rivalryLayouts";

const listShell =
  "divide-y divide-theater-gold/30 rounded-xl border border-theater-gold/35 bg-cinema-900";

const sectionHeading =
  "text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 mb-3";

const skelBone = "rounded-sm bg-cinema-800/85 motion-safe:animate-pulse";

const POSTER = "https://image.tmdb.org/t/p/w185";

export default function FriendGuesses() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = (rawCode ?? "").trim().toUpperCase();
  const navigate = useNavigate();

  const user = useUserStore((s) => s.user);
  const sessionStatus = useUserStore((s) => s.sessionStatus);
  const openRestoreAccess = useUserStore((s) => s.openRestoreAccess);
  const { follow, unfollow } = useFriendsStore();
  const yourGuesses = useGuessStore((s) => s.guesses);
  const movies = useMovieStore((s) => s.movies);
  const applyRunPhasesFromGuesses = useMovieStore(
    (s) => s.applyRunPhasesFromGuesses
  );

  const [player, setPlayer] = useState<FriendPreview | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsFollow, setNeedsFollow] = useState(false);
  const [busy, setBusy] = useState(false);

  const signedIn = sessionStatus === "ready" && Boolean(user);
  const isSelf =
    Boolean(user?.short_id) &&
    user!.short_id.toUpperCase() === code;

  const rivalry = useMemo(
    () => buildFriendRivalry(yourGuesses, guesses, movies),
    [yourGuesses, guesses, movies]
  );

  useEffect(() => {
    if (!signedIn || !code || isSelf) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    setNeedsFollow(false);
    setPlayer(null);
    setGuesses([]);

    getGuessesByCode(code)
      .then((res) => {
        if (cancelled) return;
        setPlayer(res.user);
        setGuesses(res.data ?? []);
        applyRunPhasesFromGuesses(res.data ?? []);
        setNeedsFollow(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof FriendGuessesAccessError && err.status === 403) {
          setNeedsFollow(true);
          if (err.user) setPlayer(err.user);
          setError("");
          return;
        }
        if (err instanceof FriendGuessesAccessError && err.status === 404) {
          setError("No player with that code.");
          return;
        }
        setError(friendlyFriendError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [signedIn, code, isSelf, applyRunPhasesFromGuesses]);

  async function handleFollow() {
    if (!code) return;
    setBusy(true);
    setError("");
    try {
      await follow(code);
      const res = await getGuessesByCode(code);
      setPlayer(res.user);
      setGuesses(res.data ?? []);
      applyRunPhasesFromGuesses(res.data ?? []);
      setNeedsFollow(false);
    } catch (err) {
      setError(friendlyFriendError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnfollow() {
    if (!code) return;
    setBusy(true);
    setError("");
    try {
      await unfollow(code);
      navigate("/friends");
    } catch (err) {
      setError(friendlyFriendError(err));
      setBusy(false);
    }
  }

  if (sessionStatus === "booting") {
    return <FriendGuessesSkeleton />;
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

  if (!code) {
    return <Navigate to="/friends" replace />;
  }

  if (isSelf) {
    return <Navigate to="/guesses" replace />;
  }

  if (loading) {
    return (
      <FriendGuessesSkeleton
        title={player ? `You vs ${player.name}` : "You vs…"}
      />
    );
  }

  if (needsFollow) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-6 text-left">
        <BackToFriends />
        {player ? (
          <div className="rounded-xl border border-cinema-800/80 bg-cinema-900/40 px-4 py-5">
            <PlayerPreview player={player} />
            <p className="mt-4 text-sm text-stone-400">
              Follow to compare calls head-to-head.
            </p>
            <button
              type="button"
              onClick={handleFollow}
              disabled={busy}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-theater-gold px-4 py-2 text-sm font-semibold text-cinema-950 hover:bg-theater-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : null}
              Follow {player.name}
            </button>
          </div>
        ) : (
          <p className="text-sm text-stone-400">
            Follow this player to compare guesses.
          </p>
        )}
        {error ? <p className="text-sm text-cinema-200">{error}</p> : null}
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 text-left">
        <BackToFriends />
        <p className="text-sm text-cinema-200">
          {error || "Couldn’t load this player."}
        </p>
      </div>
    );
  }

  const scoredCount =
    rivalry.record.you + rivalry.record.them + rivalry.record.ties;
  const yourOverallMiss = formatAvgMiss(rivalry.yourOverallAvgMiss);
  const theirOverallMiss = formatAvgMiss(rivalry.theirOverallAvgMiss);
  const hasOverallMiss = Boolean(yourOverallMiss || theirOverallMiss);
  const showStats = scoredCount > 0 || hasOverallMiss;

  return (
    <div className="mx-auto mt-2 w-full max-w-4xl space-y-10 text-left md:mt-6">
      <div>
        <BackToFriends />
      </div>

      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-marquee text-4xl uppercase tracking-wide text-theater-gold sm:text-5xl">
              You vs {player.name}
            </h1>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">
              <span className="sr-only">Friend code </span>
              {player.short_id}
            </p>
          </div>
          <button
            type="button"
            onClick={handleUnfollow}
            disabled={busy}
            aria-label={`Unfollow ${player.name}`}
            className="shrink-0 text-xs text-stone-400 hover:text-cinema-200 rounded-md px-2 py-1 focus-visible:outline-2 focus-visible:outline-theater-gold disabled:opacity-50"
          >
            {busy ? "…" : "Unfollow"}
          </button>
        </div>

        {showStats ? (
          <div
            className="mt-6 flex flex-col gap-6 border-t border-theater-gold/20 pt-6 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-x-12 sm:gap-y-8 sm:pt-8"
            role="region"
            aria-label="Head-to-head stats"
          >
            {hasOverallMiss ? (
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Avg % off
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3 sm:mt-3.5 sm:gap-x-10">
                  {yourOverallMiss ? (
                    <RecordStat
                      value={`${yourOverallMiss} off`}
                      label="You"
                      valueClass="text-theater-gold"
                      labelClass="text-theater-gold/80"
                    />
                  ) : null}
                  {theirOverallMiss ? (
                    <RecordStat
                      value={`${theirOverallMiss} off`}
                      label={player.name}
                      valueClass="text-stone-100"
                      labelClass="text-stone-400"
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
            {scoredCount > 0 ? (
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Movies won
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3 sm:mt-3.5 sm:gap-x-10">
                  <RecordStat
                    value={rivalry.record.you}
                    label="You"
                    valueClass="text-theater-gold"
                    labelClass="text-theater-gold/80"
                  />
                  <RecordStat
                    value={rivalry.record.them}
                    label={player.name}
                    valueClass="text-stone-100"
                    labelClass="text-stone-400"
                  />
                  {rivalry.record.ties > 0 ? (
                    <RecordStat
                      value={rivalry.record.ties}
                      label="Tied"
                      valueClass="text-stone-300"
                      labelClass="text-stone-500"
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : rivalry.shared.length > 0 ? (
          <p className="mt-4 text-sm text-stone-400">
            {rivalry.shared.length} title
            {rivalry.shared.length === 1 ? "" : "s"} in common — results
            haven&apos;t landed yet.
          </p>
        ) : null}
      </header>

      <section aria-labelledby="friend-in-common">
        <h2 id="friend-in-common" className={sectionHeading}>
          In common
          {rivalry.shared.length > 0 ? ` (${rivalry.shared.length})` : ""}
        </h2>
        {rivalry.shared.length === 0 ? (
          <p className="rounded-xl border border-theater-gold/20 bg-cinema-950/80 px-4 py-5 text-sm text-stone-400">
            No shared predictions yet. Lock the same titles to start a rivalry.
          </p>
        ) : (
          <ul className={listShell}>
            {rivalry.shared.map((duel) => (
              <SharedDuelRow
                key={duel.movie.id || duel.yours.id}
                duel={duel}
                friendName={player.name}
              />
            ))}
          </ul>
        )}
      </section>

      {rivalry.onlyTheirs.length > 0 ? (
        <section aria-labelledby="friend-only-theirs">
          <h2 id="friend-only-theirs" className={sectionHeading}>
            Only {player.name} called ({rivalry.onlyTheirs.length})
          </h2>
          <ul className={listShell}>
            {rivalry.onlyTheirs.map(({ guess, movie }) => (
              <li key={guess.id}>
                <Link
                  to={`/movie/${movie.tmdbID}`}
                  aria-label={`Details for ${movie.title}`}
                  className="group flex items-center gap-3 px-3 py-4 transition-colors hover:bg-theater-gold/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-theater-gold sm:gap-4 sm:px-5"
                >
                  <PosterThumb poster={movie.poster} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-stone-100 transition-colors group-hover:text-theater-gold">
                      {movie.title}
                    </span>
                    <span className="mt-0.5 block text-[0.65rem] uppercase tracking-[0.18em] text-stone-500">
                      {RUN_PHASE_SECTION[resolveRunPhaseLocal(movie)].status}
                    </span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-stone-500 transition-colors group-hover:text-theater-gold"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? <p className="text-sm text-cinema-200">{error}</p> : null}
    </div>
  );
}

function RecordStat({
  value,
  label,
  valueClass,
  labelClass,
}: {
  value: number | string;
  label: string;
  valueClass: string;
  labelClass: string;
}) {
  const text = String(value);
  // Keep big tabular numerals; trailing words like "off" stay in the same line.
  const offSuffix = text.endsWith(" off");
  const main = offSuffix ? text.slice(0, -4) : text;

  return (
    <div className="min-w-18 max-w-[12rem]">
      <p
        className={[
          "font-semibold leading-none text-4xl sm:text-5xl",
          valueClass,
        ].join(" ")}
      >
        <span className="tabular-nums">{main}</span>
        {offSuffix ? (
          <span className="ml-1.5 text-[0.55em] font-semibold tracking-wide">
            off
          </span>
        ) : null}
      </p>
      <p
        className={[
          "mt-1.5 truncate text-xs font-semibold uppercase tracking-[0.14em] sm:text-sm",
          labelClass,
        ].join(" ")}
        title={label}
      >
        {label}
      </p>
    </div>
  );
}

function SharedDuelRow({
  duel,
  friendName,
}: {
  duel: SharedMovieDuel;
  friendName: string;
}) {
  const outcome = duelOutcomeLabel(duel.overall, friendName, duel.phase);
  const outcomeClass =
    duel.overall === "you"
      ? "text-theater-gold"
      : duel.overall === "them"
        ? "text-stone-200"
        : "text-stone-500";
  const missAria = duelMissAria(duel, friendName);
  const yourPct = formatAvgMiss(duel.yourMiss);
  const theirPct = formatAvgMiss(duel.theirMiss);
  const hasVs = yourPct != null && theirPct != null;
  const hasAnyMiss = yourPct != null || theirPct != null;

  return (
    <li className="px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
        <Link
          to={`/movie/${duel.movie.tmdbID}`}
          aria-label={`${duel.movie.title}: ${outcome}${missAria ? `; ${missAria}` : ""}`}
          className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold sm:flex-1 sm:gap-4"
        >
          <PosterThumb poster={duel.movie.poster} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold text-stone-50 transition-colors group-hover:text-theater-gold sm:text-lg">
              {duel.movie.title}
            </span>
            <span className="mt-0.5 block text-[0.65rem] uppercase tracking-[0.18em] text-stone-500">
              {RUN_PHASE_SECTION[duel.phase].status}
            </span>
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-stone-500 transition-colors group-hover:text-theater-gold sm:hidden"
            aria-hidden
          />
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pl-12 sm:shrink-0 sm:flex-col sm:items-end sm:justify-center sm:gap-y-1 sm:pl-0 sm:text-right">
          {hasAnyMiss ? (
            <span className="flex flex-wrap items-baseline gap-x-1.5 text-sm tabular-nums sm:justify-end sm:text-[0.9375rem]">
              {yourPct != null ? (
                <span className="font-semibold text-theater-gold">
                  You {yourPct} off
                </span>
              ) : null}
              {hasVs ? (
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  vs
                </span>
              ) : null}
              {theirPct != null ? (
                <span className="font-semibold text-stone-100">
                  {friendName} {theirPct} off
                </span>
              ) : null}
            </span>
          ) : null}
          <span
            className={[
              "text-xs font-semibold uppercase tracking-[0.14em] sm:text-sm",
              hasAnyMiss ? "w-full sm:w-auto" : "",
              outcomeClass,
            ].join(" ")}
          >
            {outcome}
          </span>
        </div>
        <Link
          to={`/movie/${duel.movie.tmdbID}`}
          aria-label={`Open ${duel.movie.title}`}
          className="hidden shrink-0 self-center rounded-md text-stone-500 transition-colors hover:text-theater-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold sm:inline-flex"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <RivalryScorecard
        yours={duel.yours}
        theirs={duel.theirs}
        movie={duel.movie}
        phase={duel.phase}
        friendName={friendName}
      />
    </li>
  );
}

function PosterThumb({ poster }: { poster: string }) {
  const src = poster ? `${POSTER}${poster}` : null;
  return (
    <div className="h-14 w-9 shrink-0 overflow-hidden rounded bg-cinema-900 ring-1 ring-stone-600/40 sm:h-16 sm:w-11">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : null}
    </div>
  );
}

function BackToFriends() {
  return (
    <Link
      to="/friends"
      className="inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-theater-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold"
    >
      <ArrowLeft size={14} aria-hidden />
      Friends
    </Link>
  );
}

function FriendGuessesSkeleton({ title = "You vs…" }: { title?: string }) {
  return (
    <div
      className="mx-auto mt-2 w-full max-w-4xl space-y-10 text-left md:mt-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div>
        <BackToFriends />
      </div>

      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-marquee text-4xl uppercase tracking-wide text-theater-gold sm:text-5xl">
              {title}
            </h1>
            <p className="sr-only">Loading rivalry</p>
            <div className={`mt-2 h-3 w-20 ${skelBone}`} aria-hidden />
          </div>
          <div className={`h-6 w-16 shrink-0 ${skelBone}`} aria-hidden />
        </div>

        <div
          className="mt-6 flex flex-col gap-6 border-t border-theater-gold/20 pt-6 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-x-12 sm:gap-y-8 sm:pt-8"
          aria-hidden
        >
          <div className="min-w-0">
            <div className={`h-3 w-20 ${skelBone}`} />
            <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3 sm:mt-3.5 sm:gap-x-10">
              {[0, 1].map((i) => (
                <div key={i} className="min-w-18">
                  <div className={`h-10 w-20 sm:h-12 sm:w-24 ${skelBone}`} />
                  <div className={`mt-1.5 h-3 w-12 ${skelBone}`} />
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <div className={`h-3 w-24 ${skelBone}`} />
            <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3 sm:mt-3.5 sm:gap-x-10">
              {[0, 1].map((i) => (
                <div key={i} className="min-w-18">
                  <div className={`h-10 w-12 sm:h-12 sm:w-14 ${skelBone}`} />
                  <div className={`mt-1.5 h-3 w-12 ${skelBone}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section aria-label="In common" aria-hidden>
        <div className={`mb-3 h-3 w-28 ${skelBone}`} />
        <ul className={listShell}>
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  <div className="h-14 w-9 shrink-0 overflow-hidden rounded bg-cinema-800/85 ring-1 ring-stone-600/40 motion-safe:animate-pulse sm:h-16 sm:w-11" />
                  <div className="min-w-0 flex-1">
                    <div
                      className={`h-5 w-[min(100%,14rem)] sm:h-6 sm:w-56 ${skelBone}`}
                    />
                    <div className={`mt-0.5 h-3 w-16 ${skelBone}`} />
                  </div>
                  <div
                    className={`h-4 w-4 shrink-0 sm:hidden ${skelBone}`}
                  />
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pl-12 sm:shrink-0 sm:flex-col sm:items-end sm:justify-center sm:gap-y-1 sm:pl-0 sm:text-right">
                  <div className={`h-4 w-44 max-w-full sm:h-[0.9375rem] ${skelBone}`} />
                  <div className={`h-3 w-20 sm:h-3.5 ${skelBone}`} />
                </div>
                <div
                  className={`hidden h-4 w-4 shrink-0 self-center sm:block ${skelBone}`}
                />
              </div>

              <div className="mt-3.5 space-y-2.5 border-t border-theater-gold/20 pt-3.5 sm:mt-4 sm:pt-4">
                {/* Mobile: label/note + values band */}
                <div className="space-y-2.5 sm:hidden">
                  {Array.from({ length: 5 }, (_, row) => (
                    <div key={row} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-x-3">
                        <div className={`h-3.5 w-16 ${skelBone}`} />
                        <div className={`h-3.5 w-20 ${skelBone}`} />
                      </div>
                      <div className={`h-5 w-[min(100%,18rem)] ${skelBone}`} />
                    </div>
                  ))}
                </div>

                {/* sm+: label | values | note — bone height matches text-base row */}
                <ul className="hidden space-y-2.5 sm:block">
                  {Array.from({ length: 5 }, (_, row) => (
                    <li
                      key={row}
                      className="grid grid-cols-[7rem_1fr_auto] items-center gap-x-4"
                    >
                      <div className={`h-4 w-16 ${skelBone}`} />
                      <div className={`h-6 max-w-xs ${skelBone}`} />
                      <div className={`h-4 w-20 ${skelBone}`} />
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
