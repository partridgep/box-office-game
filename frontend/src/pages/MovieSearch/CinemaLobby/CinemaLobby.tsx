import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMovieStore } from "../../../store/useMovieStore";
import { useGuessStore } from "../../../store/useGuessStore";
import { useLobbyStore } from "../../../store/useLobbyStore";
import { getCompGroups } from "../../../services/categories.service";
import { LobbyMovie, MovieData } from "../../../types";
import { useFriendActivity } from "../../../components/Friends/useFriendActivity";
import {
  getPredictionAvailability,
  getPredictionWindows,
} from "../../../utils/predictionWindows";
import { formatMillions, formatMillionsShort } from "../../../utils/formatMoney";
import { formatPredictionBadgeLines } from "../../../utils/guessDisplay";
import { compsToMarkersByField } from "../../../components/HistoricalComps/HistoricalComps";
import PredictButton from "../../../components/PredictButton";
import LetterboardHeading, {
  backlightDelay,
} from "../../../components/Letterboard/LetterboardHeading";
import TicketStub from "../../../components/TicketStub/TicketStub";
import {
  clearStoredHeroIndex,
  enterTheater,
  isNearLobbyRestore,
  prefersReducedMotion,
  readStoredHeroIndex,
  restoreLobbyPosition,
  writeStoredHeroIndex,
  RESTORE_SCROLL_STATE,
  type TheaterLocationState,
} from "../../../utils/viewTransitions";
import { Check, Clock } from "lucide-react";
import styles from "./CinemaLobby.module.css";

const HERO_AUTOPLAY_MS = 6000;
const POSTER_SHELF = "https://image.tmdb.org/t/p/w342";
const POSTER_HERO = "https://image.tmdb.org/t/p/w1280";
const POSTER_WASH = "https://image.tmdb.org/t/p/w185";

type CompOpeningRange = { low: number; high: number };

function asMovieData(movie: LobbyMovie | MovieData): MovieData {
  return movie as MovieData;
}

function movieKey(movie: LobbyMovie | MovieData) {
  return movie.id || movie.imdbID || String(movie.tmdbID);
}

function formatOpens(released: Date | string | null | undefined) {
  if (!released) return "Date TBD";
  const date = new Date(released);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return `Opens ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

function formatMoneyTag(n: number) {
  return `$${formatMillionsShort(n, true)}`;
}

function formatCompRange(range: CompOpeningRange) {
  if (range.low === range.high) return formatMoneyTag(range.low);
  return `${formatMoneyTag(range.low)}–${formatMoneyTag(range.high)}`;
}

function PredictionBadgeLine({
  line,
  slashSep = false,
}: {
  line: string;
  slashSep?: boolean;
}) {
  const display = slashSep ? line.replace(/ \+ /g, "/") : line;
  const match = display.match(/^(OW|FINAL|RT)\s+(.*)$/);
  if (!match) {
    return <span className="tabular-nums">{display}</span>;
  }
  return (
    <span className="tabular-nums">
      <span className="font-extrabold">{match[1]}</span> {match[2]}
    </span>
  );
}

function PredictionBadge({
  lines,
  className = "",
  compact = false,
}: {
  lines: string[];
  className?: string;
  compact?: boolean;
}) {
  if (lines.length === 0) return null;
  return (
    <span
      className={[
        "flex w-full flex-col gap-0.5 rounded-md border border-theater-gold/80 text-left font-semibold tracking-wide text-theater-gold backdrop-blur-sm",
        compact
          ? "bg-cinema-950/90 p-2 text-[0.6rem] leading-snug"
          : "bg-theater-gold/20 p-2 text-xs sm:text-sm",
        className,
      ].join(" ")}
    >
      <span
        className={[
          "mb-0.5 flex items-center gap-1 uppercase tracking-[0.2em] text-theater-gold/90",
          compact ? "text-[0.55rem]" : "text-[0.65rem]",
        ].join(" ")}
      >
        <Check
          size={compact ? 10 : 14}
          className="shrink-0 text-theater-gold"
          aria-hidden="true"
        />
        You predicted
      </span>
      {lines.map((line) => (
        <PredictionBadgeLine key={line} line={line} slashSep={compact} />
      ))}
    </span>
  );
}

/** Domestic-opening span from historical comps (released titles only). */
function domesticOpeningRangeFromGroups(
  groups: Awaited<ReturnType<typeof getCompGroups>>
): CompOpeningRange | null {
  const values = compsToMarkersByField(groups)
    .domesticOpening.map((m) => m.value)
    // Ignore near-zero / junk parses so the hero never shows "$0M".
    .filter((v) => Number.isFinite(v) && v >= 1)
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  return { low: values[0], high: values[values.length - 1] };
}

function formatCallDeadline(movie: MovieData) {
  const { domesticOpening } = getPredictionAvailability(movie);
  if (!domesticOpening) return null;
  const { boxOfficeCutoff } = getPredictionWindows(movie);
  const when = boxOfficeCutoff.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `Call domestic opening before ${when}`;
}

const CLOSING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

function isOpeningThisMonth(movie: MovieData, now = new Date()) {
  if (!movie.released) return false;
  const released = new Date(movie.released);
  if (Number.isNaN(released.getTime())) return false;
  return (
    released.getFullYear() === now.getFullYear() &&
    released.getMonth() === now.getMonth()
  );
}

/** Soonest cutoff among windows that are still open. */
function soonestOpenCutoff(movie: MovieData): Date | null {
  const availability = getPredictionAvailability(movie);
  const { boxOfficeCutoff, rottenTomatoesCutoff } = getPredictionWindows(movie);
  const open: number[] = [];
  if (availability.domesticOpening) open.push(boxOfficeCutoff.getTime());
  if (availability.rottenTomatoes) open.push(rottenTomatoesCutoff.getTime());
  if (open.length === 0) return null;
  return new Date(Math.min(...open));
}

function isClosingSoon(movie: MovieData, now = Date.now()) {
  const cutoff = soonestOpenCutoff(movie);
  if (!cutoff) return false;
  const remaining = cutoff.getTime() - now;
  return remaining > 0 && remaining <= CLOSING_SOON_MS;
}

function formatDaysLeft(movie: MovieData): string | null {
  const cutoff = soonestOpenCutoff(asMovieData(movie));
  if (!cutoff) return null;
  const ms = cutoff.getTime() - Date.now();
  if (ms <= 0) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  if (ms < dayMs) {
    const hours = Math.max(1, Math.ceil(ms / hourMs));
    return hours === 1 ? "1h left" : `${hours}h left`;
  }
  const days = Math.ceil(ms / dayMs);
  return days === 1 ? "1 day left" : `${days} days left`;
}

function TitleCard({
  movie,
  density = "shelf",
  magnetic = false,
}: {
  movie: LobbyMovie | MovieData;
  density?: "shelf" | "grid";
  /** Spotlight/ring come from the shelf magnet instead of local hover. */
  magnetic?: boolean;
}) {
  const navigate = useNavigate();
  const guess = useGuessStore((state) =>
    movie.id ? state.guesses[String(movie.id)] : undefined
  );
  const to = movie.tmdbID ? `/movie/${movie.tmdbID}` : undefined;
  const daysLeft = formatDaysLeft(asMovieData(movie));
  const callLines = formatPredictionBadgeLines(guess);

  const className = [
    "group block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-theater-gold",
    density === "grid" ? "w-full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const metaBits = [formatOpens(movie.released), daysLeft].filter(Boolean);
  const ariaBits = [
    movie.title,
    formatOpens(movie.released),
    daysLeft,
    callLines.length
      ? `You predicted ${callLines.map((l) => l.replace(/ \+ /g, "/")).join(". ")}`
      : null,
  ].filter(Boolean);

  const frameClass = magnetic
    ? "relative rounded-md bg-cinema-900 ring-1 ring-cinema-800/80"
    : "relative rounded-md bg-cinema-900 ring-1 ring-cinema-800/80 transition-[box-shadow,ring-color,ring-width] duration-[320ms] ease-in-out group-hover:ring-2 group-hover:ring-theater-gold/40 group-focus-visible:ring-2 group-focus-visible:ring-theater-gold/40";

  const onPosterNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (prefersReducedMotion() || !to) return;
    event.preventDefault();
    clearStoredHeroIndex();
    enterTheater(to, navigate);
  };

  const body = (
    <>
      <div className={frameClass}>
        <div
          className="aspect-2/3 overflow-hidden rounded-md"
          data-shelf-poster={magnetic ? "" : undefined}
        >
          {movie.poster ? (
            <img
              src={`${POSTER_SHELF}${movie.poster}`}
              alt=""
              loading="lazy"
              decoding="async"
              className={`${magnetic ? "" : styles.titleCardImg} h-full w-full object-cover`}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-cinema-900 text-xs text-stone-500">
              No poster
            </div>
          )}
          {!magnetic && (
            <div className={styles.titleCardSpotlight} aria-hidden="true" />
          )}
        </div>
        {/* Outside overflow-hidden so scale grows evenly from center. */}
        <PredictionBadge
          lines={callLines}
          compact
          className={[
            "absolute left-1 top-1 z-10 max-w-[calc(100%-0.5rem)] origin-center",
            "transition-transform duration-320 ease-in-out",
            "group-hover:scale-[1.08]",
            "group-focus-visible:scale-[1.08]",
            "group-hover:translate-y-[-6.5px]",
            "group-focus-visible:translate-y-[-6.5px]",
            "motion-reduce:transition-none",
            "motion-reduce:group-hover:scale-100",
            "motion-reduce:group-focus-visible:scale-100",
            "motion-reduce:group-hover:translate-y-0",
            "motion-reduce:group-focus-visible:translate-y-0",
          ].join(" ")}
        />
      </div>
      <p className="mt-2 line-clamp-2 text-left text-sm font-semibold leading-snug text-stone-100 transition-colors duration-100 group-hover:text-yellow-200 group-focus-visible:text-theater-gold">
        {movie.title}
      </p>
      <p className="mt-0.5 text-left text-xs text-stone-400">
        {metaBits[0]}
        <span className="ml-0.5 text-stone-500">
          {metaBits[1] ? ` (${metaBits[1]})` : ""}
        </span>
      </p>
    </>
  );

  if (!to) {
    return (
      <div className={`${className} opacity-60`} aria-disabled="true">
        {body}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={className}
      aria-label={ariaBits.join(". ")}
      data-lobby-movie={movie.tmdbID ? String(movie.tmdbID) : undefined}
      onClick={onPosterNavigate}
    >
      {body}
    </Link>
  );
}

type MagnetRect = { x: number; y: number; w: number; h: number };

function measurePosterFrame(
  track: HTMLElement,
  item: HTMLElement
): MagnetRect | null {
  const poster = item.querySelector("[data-shelf-poster]");
  if (!(poster instanceof HTMLElement)) return null;
  const pr = poster.getBoundingClientRect();
  const tr = track.getBoundingClientRect();
  if (pr.width < 1 || pr.height < 1) return null;
  return {
    x: pr.left - tr.left + track.scrollLeft,
    y: pr.top - tr.top + track.scrollTop,
    w: pr.width,
    h: pr.height,
  };
}

function useMagneticPosterTrack(
  itemCount: number,
  {
    /** Per-frame lerp toward the active poster (higher = snappier). */
    lerp: lerpSpeed = 0.22,
    /** Per-frame opacity fade in/out. */
    fade: fadeSpeed = 0.28,
  }: { lerp?: number; fade?: number } = {}
) {
  const trackRef = useRef<HTMLUListElement>(null);
  const magnetRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<MagnetRect | null>(null);
  const currentRef = useRef<MagnetRect | null>(null);
  const opacityRef = useRef(0);
  const activeItemRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0);
  const lerpSpeedRef = useRef(lerpSpeed);
  const fadeSpeedRef = useRef(fadeSpeed);
  lerpSpeedRef.current = lerpSpeed;
  fadeSpeedRef.current = fadeSpeed;

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const paintMagnet = useCallback(() => {
    const el = magnetRef.current;
    const cur = currentRef.current;
    const target = targetRef.current;
    if (!el || !cur) {
      if (el) {
        el.style.opacity = "0";
        el.style.setProperty("--magnet-ring", "0");
      }
      return;
    }
    el.style.width = `${cur.w}px`;
    el.style.height = `${cur.h}px`;
    el.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
    el.style.opacity = String(opacityRef.current);

    // Ring only reads near settle; mid-slide stays nearly invisible.
    let ring = 1;
    if (target) {
      const dist = Math.hypot(target.x - cur.x, target.y - cur.y);
      const span = Math.max(cur.w * 0.45, 24);
      const travel = Math.min(1, dist / span);
      // Steep falloff: bright only at the start/end of a hop.
      ring = Math.pow(1 - travel, 5);
    } else {
      ring = opacityRef.current;
    }
    el.style.setProperty("--magnet-ring", String(ring));
  }, []);

  const tick = useCallback(() => {
    const reduced = prefersReducedMotion();
    const target = targetRef.current;
    const lerp = reduced ? 1 : lerpSpeedRef.current;
    const fade = reduced ? 1 : fadeSpeedRef.current;

    if (!target) {
      opacityRef.current += (0 - opacityRef.current) * fade;
      paintMagnet();
      if (opacityRef.current > 0.01) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        opacityRef.current = 0;
        currentRef.current = null;
        paintMagnet();
        rafRef.current = 0;
      }
      return;
    }

    if (!currentRef.current) {
      currentRef.current = { ...target };
    } else {
      const cur = currentRef.current;
      cur.x += (target.x - cur.x) * lerp;
      cur.y += (target.y - cur.y) * lerp;
      cur.w += (target.w - cur.w) * lerp;
      cur.h += (target.h - cur.h) * lerp;
    }
    opacityRef.current += (1 - opacityRef.current) * fade;
    paintMagnet();
    rafRef.current = requestAnimationFrame(tick);
  }, [paintMagnet]);

  const ensureLoop = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const moveToItem = useCallback(
    (item: HTMLElement | null) => {
      const track = trackRef.current;
      if (!track || !item) {
        activeItemRef.current = null;
        targetRef.current = null;
        ensureLoop();
        return;
      }
      const next = measurePosterFrame(track, item);
      if (!next) return;
      activeItemRef.current = item;
      targetRef.current = next;
      ensureLoop();
    },
    [ensureLoop]
  );

  useEffect(() => () => stopLoop(), [stopLoop]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      if (!activeItemRef.current) return;
      const next = measurePosterFrame(track, activeItemRef.current);
      if (next) {
        targetRef.current = next;
        ensureLoop();
      }
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [ensureLoop, itemCount]);

  const trackProps = {
    onPointerOver: (event: PointerEvent<HTMLUListElement>) => {
      const item = (event.target as HTMLElement | null)?.closest(
        "[data-shelf-item]"
      );
      if (!(item instanceof HTMLElement)) return;
      if (!trackRef.current?.contains(item)) return;
      if (item === activeItemRef.current) return;
      moveToItem(item);
    },
    onPointerLeave: () => moveToItem(null),
    onFocusCapture: (event: FocusEvent<HTMLUListElement>) => {
      const item = (event.target as HTMLElement | null)?.closest(
        "[data-shelf-item]"
      );
      if (!(item instanceof HTMLElement)) return;
      moveToItem(item);
    },
    onBlurCapture: (event: FocusEvent<HTMLUListElement>) => {
      const next = event.relatedTarget as Node | null;
      if (next && trackRef.current?.contains(next)) return;
      moveToItem(null);
    },
  };

  const magnet = (
    <li className={styles.shelfMagnetItem} aria-hidden="true">
      <div ref={magnetRef} className={styles.shelfMagnet}>
        <div className={styles.shelfMagnetSpotlight} />
      </div>
    </li>
  );

  return { trackRef, trackProps, magnet };
}

function MovieShelf({
  id,
  title,
  movies,
}: {
  id: string;
  title: string;
  movies: Array<LobbyMovie | MovieData>;
}) {
  const { trackRef, trackProps, magnet } = useMagneticPosterTrack(movies.length);

  if (movies.length === 0) return null;

  const headingId = `shelf-${id}`;

  return (
    <section className="space-y-4" aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="text-left font-marquee text-2xl uppercase tracking-wide text-white sm:text-3xl"
      >
        {title}
      </h2>
      <ul
        ref={trackRef}
        className={styles.shelfScroller}
        role="list"
        {...trackProps}
      >
        {magnet}
        {movies.map((movie) => (
          <li
            key={movieKey(movie)}
            className={styles.shelfItem}
            data-shelf-item=""
          >
            <TitleCard movie={movie} magnetic />
          </li>
        ))}
      </ul>
    </section>
  );
}

function UpcomingGrid({ movies }: { movies: MovieData[] }) {
  // Snappier than shelves — grid hops often span a full row.
  const { trackRef, trackProps, magnet } = useMagneticPosterTrack(
    movies.length,
    { lerp: 0.42, fade: 0.4 }
  );

  return (
    <section className="space-y-4" aria-labelledby="all-upcoming-heading">
      <h2
        id="all-upcoming-heading"
        className="text-left font-marquee text-2xl uppercase tracking-wide text-white sm:text-3xl"
      >
        All upcoming
      </h2>
      <ul
        ref={trackRef}
        className={`${styles.posterTrack} grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5`}
        role="list"
        {...trackProps}
      >
        {magnet}
        {movies.map((movie) => (
          <li key={movieKey(movie)} data-shelf-item="">
            <TitleCard movie={movie} density="grid" magnetic />
          </li>
        ))}
      </ul>
    </section>
  );
}

function HowItWorksBeat() {
  const steps = [
    "Pick a title",
    "Lock your opening weekend & final box office calls + Rotten Tomatoes score",
    "See how you stack when it opens",
  ];

  return (
    <section
      className="max-w-lg"
      aria-label="How it works"
      style={backlightDelay("HOW IT WORKS")}
    >
      <div className="backlit-scope">
        <LetterboardHeading as="h2" className="text-left">
          HOW IT WORKS
        </LetterboardHeading>
      </div>
      <TicketStub footer="ADMIT ONE · FIRST CALL" className="mt-4 rounded-r">
        <ol className="m-0 list-none space-y-3 p-0 text-left text-base leading-snug">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span
                className="w-6 shrink-0 tabular-nums text-ticket-ink/55"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </TicketStub>
    </section>
  );
}

function FriendActivityStrip({ movies }: { movies: MovieData[] }) {
  const { items } = useFriendActivity(movies, { limit: 3, movieScan: 8 });

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 scrollbar-none"
        role="status"
        aria-label="Recent friend predictions"
      >
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/movie/${item.tmdbID}`}
            className="shrink-0 rounded-md border border-cinema-800/80 bg-cinema-900/70 px-3 py-1.5 text-xs text-stone-400 transition-colors hover:border-theater-gold/35 hover:text-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold"
          >
            <span className="font-semibold text-theater-gold">{item.name}</span>
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
          </Link>
        ))}
      </div>
      <Link
        to="/friends"
        className="shrink-0 text-xs font-medium text-theater-gold/80 hover:text-theater-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold"
      >
        All
      </Link>
    </div>
  );
}

function FeaturedHero({
  movies,
  compRanges,
}: {
  movies: MovieData[];
  compRanges: Record<string, CompOpeningRange | null>;
}) {
  const guesses = useGuessStore((state) => state.guesses);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const restoredHeroRef = useRef(false);
  const initialHeroIndexRef = useRef<number | null>(null);
  if (initialHeroIndexRef.current === null) {
    const saved = readStoredHeroIndex();
    initialHeroIndexRef.current =
      saved != null && saved > 0 ? saved : 0;
  }
  const [index, setIndex] = useState(initialHeroIndexRef.current);
  const [autoplayPaused, setAutoplayPaused] = useState(
    initialHeroIndexRef.current > 0
  );
  const userPausedRef = useRef(initialHeroIndexRef.current > 0);
  const programmaticScrollRef = useRef(false);
  const clearProgrammaticTimerRef = useRef(0);

  const pauseAutoplay = useCallback(() => {
    userPausedRef.current = true;
    setAutoplayPaused(true);
  }, []);

  const goTo = useCallback((next: number, behavior: ScrollBehavior = "smooth") => {
    const scroller = scrollerRef.current;
    if (!scroller || movies.length === 0) return;
    const clamped = ((next % movies.length) + movies.length) % movies.length;
    const width = scroller.clientWidth;
    // CSS `scroll-behavior: smooth` makes scrollTo({ behavior: "auto" })
    // animate — assign scrollLeft (or behavior:"instant") for a true jump.
    const instant = behavior === "auto";

    programmaticScrollRef.current = true;
    window.clearTimeout(clearProgrammaticTimerRef.current);
    const release = () => {
      programmaticScrollRef.current = false;
    };
    if (instant) {
      // CSS smooth + scroll-snap-stop:always would animate through each slide.
      scroller.style.scrollBehavior = "auto";
      scroller.style.scrollSnapType = "none";
      scroller.scrollLeft = clamped * width;
      void scroller.offsetWidth;
      scroller.style.scrollBehavior = "";
      scroller.style.scrollSnapType = "";
      clearProgrammaticTimerRef.current = window.setTimeout(release, 0);
    } else {
      const onScrollEnd = () => {
        release();
        scroller.removeEventListener("scrollend", onScrollEnd);
      };
      scroller.addEventListener("scrollend", onScrollEnd);
      // Fallback when scrollend isn't fired (reduced-motion / older engines).
      clearProgrammaticTimerRef.current = window.setTimeout(release, 850);
      scroller.scrollTo({ left: clamped * width, behavior: "smooth" });
    }
    setIndex(clamped);
  }, [movies.length]);

  // Reopen the slide that was active when leaving for details.
  useLayoutEffect(() => {
    if (restoredHeroRef.current || movies.length === 0) return;
    restoredHeroRef.current = true;
    const saved = readStoredHeroIndex();
    if (saved == null || saved <= 0 || saved >= movies.length) {
      if (index >= movies.length) setIndex(0);
      return;
    }
    pauseAutoplay();
    goTo(saved, "auto");
  }, [movies.length, goTo, pauseAutoplay, index]);

  useEffect(() => {
    writeStoredHeroIndex(index);
  }, [index]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let frame = 0;
    const onScroll = () => {
      if (!programmaticScrollRef.current) {
        pauseAutoplay();
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = scroller.clientWidth || 1;
        const next = Math.round(scroller.scrollLeft / width);
        setIndex((prev) => (next === prev ? prev : next));
      });
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(clearProgrammaticTimerRef.current);
      scroller.removeEventListener("scroll", onScroll);
    };
  }, [pauseAutoplay]);

  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    if (movies.length <= 1 || autoplayPaused) return;
    if (prefersReducedMotion()) return;

    const timer = window.setInterval(() => {
      if (userPausedRef.current) return;
      goTo(indexRef.current + 1);
    }, HERO_AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [movies.length, autoplayPaused, goTo]);

  useEffect(() => {
    const onResize = () => goTo(indexRef.current, "auto");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [goTo]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (movies.length <= 1) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      pauseAutoplay();
      goTo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      pauseAutoplay();
      goTo(index - 1);
    }
  };

  const active = movies[index] ?? movies[0];

  return (
    <section
      className={styles.heroBleed}
      aria-roledescription="carousel"
      aria-label="Featured upcoming movies"
      onKeyDown={onKeyDown}
    >
      <div className="relative">
        <div
          ref={scrollerRef}
          className={styles.heroScroller}
          tabIndex={0}
          role="group"
          aria-label="Swipe or use arrow keys to browse featured titles"
          onPointerDown={pauseAutoplay}
          onTouchStart={pauseAutoplay}
          onWheel={pauseAutoplay}
          onFocus={pauseAutoplay}
        >
          {movies.map((movie, slideIndex) => {
            const guess = movie.id ? guesses[String(movie.id)] : undefined;
            const callLines = formatPredictionBadgeLines(guess);
            const isActive = slideIndex === index;
            const callDeadline = formatCallDeadline(movie);
            const compRange = movie.id ? compRanges[movie.id] : null;
            const rangeLabel =
              compRange != null ? formatCompRange(compRange) : null;
            return (
              <article
                key={movieKey(movie)}
                className={styles.heroSlide}
                aria-roledescription="slide"
                aria-label={`${slideIndex + 1} of ${movies.length}`}
                aria-hidden={!isActive}
                data-lobby-movie={movie.tmdbID ? String(movie.tmdbID) : undefined}
                ref={(node) => {
                  if (!node) return;
                  if (isActive) node.removeAttribute("inert");
                  else node.setAttribute("inert", "");
                }}
              >
                {/* Mobile: full-bleed poster cover. Desktop: soft wash only — artwork stays inset. */}
                <div className="absolute inset-0 lg:hidden" aria-hidden="true">
                  {movie.poster ? (
                    <img
                      src={`${POSTER_HERO}${movie.poster}`}
                      alt=""
                      className="h-full w-full object-cover object-top"
                      draggable={false}
                    />
                  ) : (
                    <div className="h-full w-full bg-cinema-900" />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-cinema-950 via-cinema-950/35 to-cinema-950/10" />
                  <div className="absolute inset-0 bg-linear-to-r from-cinema-950/55 via-transparent to-cinema-950/25" />
                </div>

                <div className="absolute inset-0 hidden bg-cinema-950 lg:block" aria-hidden="true">
                  {movie.poster ? (
                    <img
                      src={`${POSTER_WASH}${movie.poster}`}
                      alt=""
                      className="h-full w-full scale-110 object-cover opacity-90 blur-lg"
                      draggable={false}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-cinema-950/55" />
                  <div className="absolute inset-0 bg-linear-to-r from-cinema-950/80 via-cinema-950/40 to-cinema-950/70" />
                </div>

                <div className="relative z-5 flex h-full min-h-[inherit] flex-col justify-end px-5 pb-20 pt-16 sm:px-8 sm:pb-20 lg:justify-center lg:px-12 lg:py-8">
                  <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:gap-12 xl:gap-16">
                    {movie.poster ? (
                      <div className="hidden w-72 shrink-0 xl:w-86 lg:block">
                        <div className="aspect-2/3 overflow-hidden rounded-lg shadow-2xl ring-1 ring-theater-gold/25">
                          <img
                            src={`${POSTER_HERO}${movie.poster}`}
                            alt=""
                            className="h-full w-full object-cover"
                            draggable={false}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="flex min-w-0 flex-1 flex-col gap-6 text-left sm:gap-7 lg:gap-10">
                      <div className="max-w-3xl rounded-lg bg-linear-to-r from-cinema-950/45 via-cinema-950/35 to-transparent px-3 py-3 sm:px-4 sm:py-3.5 lg:from-cinema-950/60 lg:via-cinema-950/35">
                        <div className="space-y-2">
                          <h2
                            className="font-marquee text-4xl uppercase leading-[0.95] tracking-wide text-white sm:text-5xl lg:text-6xl xl:text-7xl"
                            id={isActive ? "lobby-hero-title" : undefined}
                          >
                            {movie.title}
                          </h2>
                          <p className="text-sm text-stone-200 sm:text-base">
                            {formatOpens(movie.released)}
                          </p>
                          {callDeadline ? (
                            <p className="flex max-w-xl items-center gap-2 text-sm leading-snug text-stone-200 sm:text-base">
                              <Clock
                                size={14}
                                className="shrink-0 text-stone-300"
                                aria-hidden="true"
                              />
                              <span>{callDeadline}</span>
                            </p>
                          ) : null}
                          {rangeLabel ? (
                            <p className="text-sm leading-snug text-stone-200 sm:text-base">
                              Comps suggest{" "}
                              <span className="font-semibold text-theater-gold">
                                {rangeLabel}
                              </span>
                            </p>
                          ) : null}
                          <PredictionBadge
                            lines={callLines}
                            className="mt-3 lg:backdrop-blur-none"
                          />
                        </div>
                      </div>

                      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:mt-1 lg:max-w-2xl">
                        <PredictButton
                          to={movie.tmdbID ? `/movie/${movie.tmdbID}` : undefined}
                          movieTitle={movie.title}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {movies.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 sm:bottom-4">
          {movies.map((movie, idx) => (
            <button
              key={movieKey(movie)}
              type="button"
              onClick={() => {
                pauseAutoplay();
                goTo(idx);
              }}
              aria-label={`Show ${movie.title}`}
              aria-current={idx === index ? "true" : undefined}
              className={`h-2.5 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold ${
                idx === index
                  ? "w-7 bg-theater-gold"
                  : "w-2.5 bg-stone-500/70 hover:bg-stone-300"
              }`}
            />
          ))}
        </div>
      )}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {active
          ? [
              active.title,
              formatOpens(active.released),
              formatCallDeadline(active),
              active.id && compRanges[active.id]
                ? `Comps suggest ${formatCompRange(compRanges[active.id]!)}`
                : null,
              (() => {
                const lines = formatPredictionBadgeLines(
                  active.id ? guesses[String(active.id)] : undefined
                );
                return lines.length ? `Your call ${lines.join(". ")}` : null;
              })(),
            ]
              .filter(Boolean)
              .join(". ")
          : ""}
      </div>
    </section>
  );
}

export function CinemaLobby() {
  const location = useLocation();
  const { movies } = useMovieStore();
  const guesses = useGuessStore((state) => state.guesses);
  const lobbySections = useLobbyStore((s) => s.sections);
  const sectionsLoaded = useLobbyStore((s) => s.loaded);
  const ensureSections = useLobbyStore((s) => s.ensureSections);

  const theaterState = location.state as TheaterLocationState | null;
  const restoreScrollY = theaterState?.[RESTORE_SCROLL_STATE];

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

  const moviesById = useMemo(() => {
    const map = new Map<string, MovieData>();
    for (const movie of movieList) {
      if (movie.id) map.set(movie.id, movie);
    }
    return map;
  }, [movieList]);

  const openSectionMovies = useMemo(() => {
    return lobbySections
      .map((section) => {
        const sectionMovies = section.movies
          .map((lobbyMovie) => moviesById.get(lobbyMovie.id) || asMovieData(lobbyMovie))
          .filter((movie) => {
            try {
              return getPredictionAvailability(asMovieData(movie)).anyOpen;
            } catch {
              return false;
            }
          });
        return { ...section, movies: sectionMovies };
      })
      .filter((section) => section.movies.length > 0);
  }, [lobbySections, moviesById]);

  const openingThisMonth = useMemo(
    () =>
      movieList
        .filter((movie) => isOpeningThisMonth(movie))
        .sort((a, b) => {
          const aTime = a.released ? new Date(a.released).getTime() : 0;
          const bTime = b.released ? new Date(b.released).getTime() : 0;
          return aTime - bTime;
        }),
    [movieList]
  );

  const closingSoon = useMemo(
    () =>
      movieList
        .filter((movie) => isClosingSoon(movie))
        .sort((a, b) => {
          const aCut = soonestOpenCutoff(a)?.getTime() ?? Number.POSITIVE_INFINITY;
          const bCut = soonestOpenCutoff(b)?.getTime() ?? Number.POSITIVE_INFINITY;
          return aCut - bCut;
        }),
    [movieList]
  );

  const featuredMovies = movieList.slice(0, 5);
  const featuredIdsKey = featuredMovies.map((m) => m.id).filter(Boolean).join(",");

  const [compRanges, setCompRanges] = useState<
    Record<string, CompOpeningRange | null>
  >({});

  useEffect(() => {
    void ensureSections();
  }, [ensureSections]);

  useEffect(() => {
    let cancelled = false;
    const ids = featuredIdsKey ? featuredIdsKey.split(",") : [];

    if (ids.length === 0) {
      setCompRanges({});
      return;
    }

    async function loadCompRanges() {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const groups = await getCompGroups(id);
            return [id, domesticOpeningRangeFromGroups(groups)] as const;
          } catch (error) {
            console.error(`Error fetching comps for hero movie ${id}:`, error);
            return [id, null] as const;
          }
        })
      );
      if (cancelled) return;
      const next: Record<string, CompOpeningRange | null> = {};
      for (const [id, range] of entries) next[id] = range;
      setCompRanges(next);
    }

    loadCompRanges();
    return () => {
      cancelled = true;
    };
  }, [featuredIdsKey]);

  // One-shot exact scroll restore before paint. Section cache keeps height stable.
  useLayoutEffect(() => {
    if (typeof restoreScrollY !== "number" || restoreScrollY < 0) return;
    if (!sectionsLoaded && restoreScrollY > 0) return;
    if (isNearLobbyRestore(restoreScrollY)) return;
    restoreLobbyPosition(restoreScrollY);
  }, [restoreScrollY, sectionsLoaded, openSectionMovies.length, movieList.length]);

  const hasAnyGuess = Object.keys(guesses).length > 0;

  return (
    <div className="text-stone-100">
      <h1 className="sr-only">Upcoming</h1>

      {featuredMovies.length > 0 && (
        <FeaturedHero movies={featuredMovies} compRanges={compRanges} />
      )}

      <div className="mx-auto mt-10 w-full max-w-7xl space-y-12 px-0 sm:mt-12 sm:space-y-14">
        {!hasAnyGuess && <HowItWorksBeat />}

        {movieList.length === 0 ? (
          <p className="py-16 text-center text-stone-400">
            Nothing&apos;s open for predictions right now.
          </p>
        ) : (
          <>
            <FriendActivityStrip movies={movieList} />

            <MovieShelf
              id="opening-this-month"
              title="Opening this Month"
              movies={openingThisMonth}
            />
            <MovieShelf
              id="closing-soon"
              title="Predictions Closing soon"
              movies={closingSoon}
            />

            {openSectionMovies.map((section) => (
              <MovieShelf
                key={section.id}
                id={section.id}
                title={section.label}
                movies={section.movies}
              />
            ))}

            <UpcomingGrid movies={movieList} />
          </>
        )}
      </div>
    </div>
  );
}
