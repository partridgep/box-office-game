import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { exitTheater } from "../../utils/viewTransitions";

import { useMovieDetailsData } from "./useMovieDetailsData";
import { usePageMode } from "../../hooks/usePageMode";
import MovieContextPanel from "../../components/MovieContextPanel/MovieContextPanel";
import {
  compsToMarkersByField,
  type CompMetricField,
  type PlaceCompMetric,
} from "../../components/HistoricalComps/HistoricalComps";
import PredictionControls, {
  type GuestLockPhase,
} from "../../components/PredictionControls/PredictionControls";
import LockedPredictionSummary from "../../components/LockedPredictionSummary/LockedPredictionSummary";
import {
  OverallPerformance,
  AccuracyGrid,
  FriendComparison,
} from "../../components/GuessComparisonCards/GuessComparisonCards";
import BoxOfficeJourneyChart from "../../components/BoxOfficeJourney/BoxOfficeJourneyChart";
import VersusComps from "../../components/VersusComps/VersusComps";
import SocialProof from "../../components/SocialProof/SocialProof";
import ShareLink from "../../components/ShareLink/ShareLink";
import CountdownStrip from "../../components/Countdown/CountdownStrip";
import TicketStub from "../../components/TicketStub/TicketStub";
import PixelBackArrow from "../../components/TicketStub/PixelBackArrow";
import PredictContextSheet, {
  PREDICT_SHEET_PEEK_HEIGHT,
  type SheetHeightChange,
} from "../../components/PredictContextSheet/PredictContextSheet";
import { hasAnyActuals } from "../../utils/guessComparison";
import {
  EMPTY_HIDDEN,
  hiddenCompsUserKey,
  selectHiddenCompIds,
  useHiddenCompsStore,
} from "../../store/useHiddenCompsStore";
import {
  EMPTY_STARRED,
  selectStarredCompIds,
  useStarredCompsStore,
} from "../../store/useStarredCompsStore";
const POSTER_BACKDROP = "https://image.tmdb.org/t/p/w1280";

function PosterBackground({
  src,
  className,
  fade = "page",
}: {
  src: string;
  className?: string;
  /** "responsive": page fade below lg, left-edge fade at lg+. */
  fade?: "page" | "left" | "responsive";
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  if (!src) return null;

  return (
    <div className={`pointer-events-none ${className ?? ""}`} aria-hidden>
      <img
        ref={imgRef}
        src={src}
        alt=""
        decoding="async"
        className="poster-backdrop-img absolute inset-0 h-full w-full object-cover object-top"
        data-loaded={loaded ? "" : undefined}
        onLoad={() => setLoaded(true)}
      />
      {fade === "page" ? (
        <div className="absolute inset-0 bg-linear-to-b from-cinema-950/35 via-cinema-950/65 to-cinema-950/90" />
      ) : null}
      {fade === "left" ? (
        <>
          <div className="absolute inset-0 bg-linear-to-b from-cinema-950/20 via-cinema-950/45 to-cinema-950/80" />
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-transparent to-cinema-950/85" />
        </>
      ) : null}
      {fade === "responsive" ? (
        <>
          <div className="absolute inset-0 bg-linear-to-b from-cinema-950/35 via-cinema-950/65 to-cinema-950/90 lg:hidden" />
          <div className="absolute inset-0 hidden bg-linear-to-b from-cinema-950/20 via-cinema-950/45 to-cinema-950/80 lg:block" />
          <div className="absolute inset-0 hidden bg-linear-to-r from-transparent via-transparent to-cinema-950/85 lg:block" />
        </>
      ) : null}
    </div>
  );
}

export default function MovieDetails() {
  const navigate = useNavigate();
  const {
    id,
    movie,
    user,
    isInDatabase,
    predictionAvailability,
    loggedGuess,
    inviterGuess,
    allMovieGuesses,
    friendGuesses,
    compGroups,
    boxOffice,
    refreshGuesses,
  } = useMovieDetailsData();

  const [showingShareDialog, setShowingShareDialog] = useState(false);
  /** Guest name → receipt → seal; keep predict shell mounted and delay pool reveal. */
  const [guestLockPhase, setGuestLockPhase] = useState<GuestLockPhase>("idle");
  const holdPredictForGuest = guestLockPhase !== "idle";
  const [retroactiveMode, setRetroactiveMode] = useState(false);

  useEffect(() => {
    setGuestLockPhase("idle");
  }, [id]);
  /** Linked brushing: Historical Comps row ↔ matching slider ticks. */
  const [highlightedCompId, setHighlightedCompId] = useState<string | null>(
    null,
  );
  /** Mobile sheet height → page bottom pad so Lock / RT stay scrollable. */
  const [sheetPadPx, setSheetPadPx] = useState(PREDICT_SHEET_PEEK_HEIGHT);
  const [sheetPadImmediate, setSheetPadImmediate] = useState(true);
  /** PredictionControls fills this so the comps sheet can place one metric. */
  const placeCompMetricRef = useRef<PlaceCompMetric | null>(null);

  const onSheetHeightChange = useCallback<SheetHeightChange>((heightPx, opts) => {
    setSheetPadImmediate(opts.immediate);
    setSheetPadPx(heightPx);
  }, []);

  /**
   * Visible band above the comps sheet. Prefer the live sheet top so occlusion
   * matches what’s on screen (pad math can lag peek→half).
   */
  const predictVisibleBand = useCallback(() => {
    const topRail = document.querySelector("[data-top-rail]");
    const bottomNav = document.querySelector("[data-bottom-nav]");
    const top =
      (topRail instanceof HTMLElement
        ? topRail.getBoundingClientRect().bottom
        : 60) + 8;
    const navH =
      bottomNav instanceof HTMLElement
        ? bottomNav.getBoundingClientRect().height
        : 72;
    const sheet = document.querySelector("[data-predict-sheet]");
    const sheetTop =
      sheet instanceof HTMLElement
        ? sheet.getBoundingClientRect().top
        : window.innerHeight - navH - sheetPadPx;
    const bottom = Math.min(sheetTop, window.innerHeight - navH) - 8;
    return { top, bottom };
  }, [sheetPadPx]);

  const smoothScrollBy = useCallback((delta: number): Promise<void> => {
    if (Math.abs(delta) < 1) return Promise.resolve();

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("scrollend", finish);
        window.clearTimeout(fallback);
        // One frame after scroll so layout/paint catch up before the thumb eases.
        requestAnimationFrame(() => resolve());
      };
      window.addEventListener("scrollend", finish, { once: true });
      // Safari / older engines may lack scrollend.
      const fallback = window.setTimeout(finish, 450);
      window.scrollBy({ top: delta, behavior: "smooth" });
    });
  }, []);

  const scrollPredictFieldIntoView = useCallback(
    (field: CompMetricField): Promise<void> => {
      const root = document.querySelector("[data-predict-mobile]");
      const el = root?.querySelector(`[data-predict-field="${field}"]`);
      if (!(el instanceof HTMLElement)) return Promise.resolve();

      const { top, bottom: visibleBottom } = predictVisibleBand();
      const rect = el.getBoundingClientRect();

      let delta = 0;
      if (rect.top < top) {
        delta = rect.top - top;
      } else if (rect.bottom > visibleBottom) {
        delta = rect.bottom - visibleBottom;
      }

      return smoothScrollBy(delta);
    },
    [predictVisibleBand, smoothScrollBy],
  );

  /**
   * Pinning can leave slider tracks under the sheet. Check real field boxes
   * against the sheet’s top edge — not the tall form wrapper.
   */
  const scrollPredictionsIntoViewIfNeeded = useCallback(() => {
    const root = document.querySelector("[data-predict-mobile]");
    if (!root) return;

    const fields = root.querySelectorAll<HTMLElement>("[data-predict-field]");
    if (fields.length === 0) return;

    const { top, bottom: visibleBottom } = predictVisibleBand();
    const bandH = visibleBottom - top;
    if (bandH < 40) return;

    // Ticks sit mid/lower in each field — need a solid slice above the sheet.
    const MIN_FIELD_VISIBLE = Math.min(120, bandH * 0.55);
    let bestOverlap = 0;
    for (const field of fields) {
      const rect = field.getBoundingClientRect();
      const overlap =
        Math.min(rect.bottom, visibleBottom) - Math.max(rect.top, top);
      if (overlap > bestOverlap) bestOverlap = overlap;
    }
    if (bestOverlap >= MIN_FIELD_VISIBLE) return;

    void smoothScrollBy(fields[0].getBoundingClientRect().top - top);
  }, [predictVisibleBand, smoothScrollBy]);

  const onPlaceCompMetric = useCallback<PlaceCompMetric>((field, value) => {
    void (async () => {
      await scrollPredictFieldIntoView(field);
      placeCompMetricRef.current?.(field, value);
    })();
  }, [scrollPredictFieldIntoView]);

  const onHighlightComp = useCallback((compMovieId: string | null) => {
    setHighlightedCompId(compMovieId);
  }, []);

  const clearCompHighlight = useCallback(() => {
    setHighlightedCompId(null);
  }, []);

  // After pin (+ peek→half), measure live sheet top and scroll sliders if covered.
  useLayoutEffect(() => {
    if (!highlightedCompId) return;
    scrollPredictionsIntoViewIfNeeded();
  }, [highlightedCompId, scrollPredictionsIntoViewIfNeeded]);

  // Tap outside the pinned comps row clears the brush (ticks no longer place values).
  useEffect(() => {
    if (!highlightedCompId) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest(`[data-pinned-comp="${CSS.escape(highlightedCompId)}"]`)) {
        return;
      }
      // Another comps row will set the pin itself — don't clear first (avoids swap flicker).
      if (target.closest("[data-comp-row]")) return;
      // Keep sheet chrome (handle / tabs) from dismissing mid-gesture.
      if (target.closest("[data-sheet-chrome]")) return;
      // Tapping the pinned comp’s own slider tick places the value — don’t unpin.
      if (target.closest("[data-highlighted-comp-tick]")) return;
      setHighlightedCompId(null);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [highlightedCompId]);

  const pageMode = usePageMode(movie, loggedGuess, isInDatabase);

  const canUseRetroactiveMode =
    isInDatabase &&
    !loggedGuess &&
    predictionAvailability != null &&
    !(
      predictionAvailability.domesticOpening &&
      predictionAvailability.rottenTomatoes
    );
  const retroactiveActive = retroactiveMode && canUseRetroactiveMode;

  const mode = retroactiveActive ? "predict" : pageMode;

  const effectiveAvailability = useMemo(() => {
    if (!predictionAvailability || !retroactiveActive) {
      return predictionAvailability;
    }
    return {
      domesticOpening: true,
      internationalOpening: true,
      finalDomestic: true,
      finalInternational: true,
      rottenTomatoes: true,
      anyOpen: true,
    };
  }, [predictionAvailability, retroactiveActive]);

  // Must use movie.id (DB uuid), not the route param (tmdbID) — same key as HistoricalComps.
  const subjectMovieId = movie?.id ?? null;
  const prefsUserKey = hiddenCompsUserKey(user?.id);
  const hiddenCompIds = useHiddenCompsStore((s) =>
    subjectMovieId
      ? selectHiddenCompIds(s.byUser, prefsUserKey, subjectMovieId)
      : EMPTY_HIDDEN
  );
  const starredCompIds = useStarredCompsStore((s) =>
    subjectMovieId
      ? selectStarredCompIds(s.byUser, prefsUserKey, subjectMovieId)
      : EMPTY_STARRED
  );

  const compMarkersByField = useMemo(() => {
    return compsToMarkersByField(
      compGroups,
      hiddenCompIds,
      starredCompIds,
      // Star focus mode: preview a non-starred comp’s ticks while brushing.
      highlightedCompId,
    );
  }, [compGroups, hiddenCompIds, starredCompIds, highlightedCompId]);

  const inviterName = useMemo(() => {
    if (!inviterGuess) return undefined;
    if (user && inviterGuess.user_id === user.id) return undefined;
    return inviterGuess.guess_user?.name;
  }, [inviterGuess, user]);

  const posterUrl = movie?.poster ? `${POSTER_BACKDROP}${movie.poster}` : "";

  if (!movie || !predictionAvailability || !effectiveAvailability) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-cinema-400" size={48} />
      </div>
    );
  }
  // Hold sealed until the guest lock stamp finishes (guess may already be saved).
  const revealGuesses =
    (Boolean(loggedGuess) || hasAnyActuals(movie)) && !holdPredictForGuest;
  const useTicketShell = mode !== "results";

  const releaseDate = movie.released
    ? new Date(movie.released).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "TBA";

  const renderTitleBlock = () => (
    <TicketStub compact className="max-w-md rounded-r">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => exitTheater(navigate)}
          className="shrink-0 -ml-1 mt-0.5 p-1 text-ticket-ink/80 hover:text-ticket-ink hover:bg-ticket-ink/10 transition-colors"
          aria-label="Back to upcoming"
        >
          <PixelBackArrow width={56} height={30} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-left text-2xl md:text-4xl font-bold uppercase leading-none mt-1">
            {movie.title}
          </h1>
          <p className="text-xs text-left uppercase tracking-wide mt-2 text-ticket-ink/80">
            {releaseDate}
          </p>
          <p className="text-xs text-left uppercase tracking-wide mt-0.5 text-ticket-ink/80">
            {movie.genre}
          </p>
          <p className="text-xs text-left uppercase tracking-wide mt-0.5 text-ticket-ink/80">
            {movie.rated || "Not Yet Rated"}
          </p>
          {id && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              <button
                type="button"
                onClick={() => navigate(`/admin/movie/${id}`)}
                className="text-[10px] uppercase tracking-wider text-ticket-ink/45 hover:text-ticket-ink/80 transition-colors font-[Outfit,sans-serif]"
              >
                Admin View
              </button>
              {canUseRetroactiveMode && (
                <button
                  type="button"
                  onClick={() => setRetroactiveMode((on) => !on)}
                  aria-pressed={retroactiveMode}
                  className={`text-[10px] uppercase tracking-wider transition-colors font-[Outfit,sans-serif] ${
                    retroactiveMode
                      ? "text-ticket-ink font-bold"
                      : "text-ticket-ink/45 hover:text-ticket-ink/80"
                  }`}
                >
                  {retroactiveMode ? "Exit Retroactive Mode" : "Retroactive Predict"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </TicketStub>
  );

  const renderPanelContent = (opts?: { enablePlaceFromComps?: boolean }) => (
    <>
      {retroactiveActive && (
        <div className="mb-4 border border-ticket-ink/40 py-2 px-3 text-xs uppercase tracking-wide text-ticket-ink">
          Admin retroactive mode — cutoffs are ignored for this prediction.
        </div>
      )}

      {(mode === "predict" || holdPredictForGuest) && movie.id && (
        <PredictionControls
          movieId={movie.id}
          availability={effectiveAvailability}
          compMarkersByField={compMarkersByField}
          highlightedCompMovieId={highlightedCompId}
          onDismissCompHighlight={clearCompHighlight}
          inviterName={inviterName}
          guestLockPhase={guestLockPhase}
          onGuestLockPhaseChange={setGuestLockPhase}
          onGuessLocked={() => {
            void refreshGuesses();
          }}
          placeCompMetricRef={
            opts?.enablePlaceFromComps ? placeCompMetricRef : undefined
          }
        />
      )}

      {mode === "waiting" && loggedGuess && !holdPredictForGuest && (
        <LockedPredictionSummary
          guess={loggedGuess}
          friendGuess={
            inviterGuess?.user_id !== loggedGuess.user_id
              ? inviterGuess
              : undefined
          }
          onShareClick={() => setShowingShareDialog(true)}
        />
      )}

      {mode === "closed" && (
        <div className="min-h-50 flex flex-col items-center justify-center text-center gap-2 text-ticket-ink">
          <p className="font-bold uppercase tracking-wide text-lg">
            Predictions for this movie have closed.
          </p>
          <p className="text-sm text-ticket-ink/65 font-[Outfit,sans-serif]">
            The movie has been released, therefore you cannot make predictions for it.
          </p>
        </div>
      )}

      {mode === "notInArena" && (
        <div className="min-h-50 flex flex-col items-center justify-center text-center gap-2 text-ticket-ink">
          <p className="font-bold uppercase tracking-wide text-lg">
            This movie is not in the Arena yet.
          </p>
          <p className="text-sm text-ticket-ink/65 font-[Outfit,sans-serif]">
            Browse upcoming titles to make predictions.
          </p>
        </div>
      )}
    </>
  );

  const renderPredictSurface = (opts?: {
    enablePlaceFromComps?: boolean;
    ticketClassName?: string;
  }) => {
    const content = renderPanelContent({
      enablePlaceFromComps: opts?.enablePlaceFromComps,
    });
    if (useTicketShell) {
      return (
        <TicketStub
          watermark={movie.rated || "NR"}
          footer={`${movie.title.toUpperCase()} · ADMIT ONE · BOX OFFICE GUESSER`}
          className={opts?.ticketClassName ?? "rounded-r"}
        >
          {content}
        </TicketStub>
      );
    }
    return (
      <div className="rounded-2xl border border-theater-gold/20 bg-cinema-950/90 backdrop-blur-md p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        {content}
      </div>
    );
  };

  // Guest seal must finish on the ticket before the results layout replaces it.
  if (mode === "results" && loggedGuess && !holdPredictForGuest) {
    const preferredFriendGuessId =
      inviterGuess && inviterGuess.user_id !== loggedGuess.user_id
        ? inviterGuess.id
        : undefined;
    // From sm up: each block is its own card. Below sm they share one continuous reel.
    const resultsPanel =
      "sm:rounded-2xl sm:border sm:border-theater-gold/20 sm:bg-cinema-950/90 sm:backdrop-blur-md sm:p-6 sm:shadow-[0_0_40px_rgba(0,0,0,0.4)]";

    return (
      <>
        <PosterBackground src={posterUrl} fade="page" className="fixed inset-0 z-0" />

        {/* -mx-4 cancels Layout main px-4 below sm so charts/data can use full width */}
        <div className="relative z-10 pt-5 -mx-4 sm:mx-0">
          <div className="px-4 sm:px-0 mb-6 grid grid-cols-1 lg:grid-cols-[minmax(0,28rem)_1fr] gap-6 items-stretch">
            {renderTitleBlock()}
            <OverallPerformance
              movie={movie}
              userGuess={loggedGuess}
              allMovieGuesses={allMovieGuesses}
              friendGuesses={friendGuesses}
              className="flex flex-col justify-center backdrop-blur-md"
            />
          </div>

          <div className="space-y-8 bg-cinema-950/90 backdrop-blur-md px-3 py-5 sm:space-y-6 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <section className={resultsPanel}>
              <AccuracyGrid
                movie={movie}
                userGuess={loggedGuess}
                allMovieGuesses={allMovieGuesses}
                friendGuesses={friendGuesses}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              />
            </section>

            <section className={resultsPanel}>
              <BoxOfficeJourneyChart
                domesticWeekly={boxOffice.weekly}
                internationalWeekly={boxOffice.international?.weekly ?? []}
                userFinalDomesticPrediction={loggedGuess.final_domestic}
                userFinalInternationalPrediction={loggedGuess.final_international}
              />
            </section>

            <VersusComps
              movie={movie}
              userGuess={loggedGuess}
              groups={compGroups}
              className={resultsPanel}
            />

            <section
              className={`${resultsPanel} -mx-3 sm:mx-0 sm:overflow-hidden sm:p-0`}
            >
              <SocialProof
                movie={movie}
                allMovieGuesses={allMovieGuesses}
                friendGuesses={friendGuesses}
                revealGuesses={revealGuesses}
                bare
              />
            </section>

            {friendGuesses.length > 0 && (
              <section className={resultsPanel}>
                <FriendComparison
                  movie={movie}
                  userGuess={loggedGuess}
                  friendGuesses={friendGuesses}
                  preferredFriendGuessId={preferredFriendGuessId}
                />
              </section>
            )}
          </div>

          <section className="mt-0 space-y-5 border-t border-theater-gold/25 pt-16 sm:pt-6 sm:mt-6 sm:space-y-4 sm:border-t-0">
            <h2 className="px-3 sm:px-0 text-2xl font-semibold text-stone-100 uppercase tracking-wider">
              About this movie
            </h2>
            <MovieContextPanel
              movie={movie}
              allMovieGuesses={allMovieGuesses}
              friendGuesses={friendGuesses}
              revealGuesses={revealGuesses}
              compGroups={compGroups}
              variant="wide"
            />
          </section>
        </div>
      </>
    );
  }

  const mobilePredict = mode === "predict" || holdPredictForGuest;

  return (
    <>
      <PosterBackground
        src={posterUrl}
        fade="responsive"
        className="fixed inset-0 z-0 lg:inset-y-0 lg:left-0 lg:right-auto lg:w-1/2"
      />

      {/* Mobile: single-column document scroll — no side-enter (desktop only). */}
      <div
        data-predict-mobile
        className="relative z-10 space-y-6 pt-5 lg:hidden"
        style={
          mobilePredict
            ? {
                paddingBottom: sheetPadPx,
                transition: sheetPadImmediate
                  ? "none"
                  : "padding-bottom 280ms var(--ease-snappy)",
              }
            : undefined
        }
      >
        {renderTitleBlock()}
        {/* Guest lock-in: ticket only — countdown / sealed pool compete with name+receipt. */}
        {!holdPredictForGuest ? (
          <CountdownStrip movie={movie} availability={predictionAvailability} />
        ) : null}
        {mobilePredict && !holdPredictForGuest ? (
          <SocialProof
            movie={movie}
            allMovieGuesses={allMovieGuesses}
            friendGuesses={friendGuesses}
            revealGuesses={revealGuesses}
            compact
          />
        ) : null}
        {renderPredictSurface({
          enablePlaceFromComps: true,
          ticketClassName: "rounded-r",
        })}
        {!mobilePredict ? (
          <MovieContextPanel
            movie={movie}
            allMovieGuesses={allMovieGuesses}
            friendGuesses={friendGuesses}
            revealGuesses={revealGuesses}
            compGroups={compGroups}
          />
        ) : null}
      </div>

      {mobilePredict && movie.id && effectiveAvailability ? (
        <PredictContextSheet
          movie={movie}
          compGroups={compGroups}
          highlightedCompId={highlightedCompId}
          onHighlightComp={onHighlightComp}
          onHeightChange={onSheetHeightChange}
          onPlaceCompMetric={onPlaceCompMetric}
          away={holdPredictForGuest}
          metricAvailability={{
            domesticOpening: effectiveAvailability.domesticOpening,
            internationalOpening: effectiveAvailability.internationalOpening,
            finalDomestic: effectiveAvailability.finalDomestic,
            finalInternational: effectiveAvailability.finalInternational,
            rottenTomatoesScore: effectiveAvailability.rottenTomatoes,
          }}
        />
      ) : null}

      {/*
        Desktop: each viewport half is a full-height scrollport (inset-y-0).
        pt-19 on content clears the top rail at rest; scrolling goes under the
        rail with no dead gap between header and content.
        key={id} remounts panes so the edge-enter plays once per movie entry.
      */}
      <div
        key={`context-${id}`}
        role="region"
        aria-label="Movie context"
        className="movie-pane-enter-left relative z-10 hidden w-1/2 overflow-x-clip overflow-y-auto overscroll-y-contain lg:fixed lg:inset-y-0 lg:left-0 lg:block"
      >
        <div className="max-w-full space-y-6 overflow-x-clip px-6 pt-19 pb-6 pr-4">
          {renderTitleBlock()}
          <MovieContextPanel
            movie={movie}
            allMovieGuesses={allMovieGuesses}
            friendGuesses={friendGuesses}
            revealGuesses={revealGuesses}
            compGroups={compGroups}
            onHighlightComp={
              mode === "predict" || holdPredictForGuest
                ? setHighlightedCompId
                : undefined
            }
          />
        </div>
      </div>

      <div
        key={`predict-${id}`}
        role="region"
        aria-label="Your prediction"
        className="movie-pane-enter-right relative z-10 hidden w-1/2 overflow-x-clip overflow-y-auto overscroll-y-contain lg:fixed lg:inset-y-0 lg:right-0 lg:block"
      >
        <div className="max-w-full space-y-4 overflow-x-clip px-6 pt-19 pb-6 pl-4">
          <CountdownStrip movie={movie} availability={predictionAvailability} />
          {renderPredictSurface({ ticketClassName: "max-w-full rounded-r" })}
        </div>
      </div>

      {showingShareDialog && loggedGuess && id && (
        <ShareLink
          shareLink={`${window.location.origin}/movie/${id}?fromGuess=${loggedGuess.id}`}
          onClose={() => setShowingShareDialog(false)}
        />
      )}
    </>
  );
}
