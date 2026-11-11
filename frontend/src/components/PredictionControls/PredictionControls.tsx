import { useState, useEffect, useRef, type MutableRefObject } from "react";
import { useUserStore } from "../../store/useUserStore";
import { useGuessStore } from "../../store/useGuessStore";
import { useInviteStore } from "../../store/useInviteStore";
import { connectUsers } from "../../services/users.service";
import UserSignup from "../UserSignup/UserSignupPrompt";
import UserConfirmation from "../UserSignup/UserConfirmation";
import { ArrowLeft } from "lucide-react";
import { postGuess } from "../../services/guesses.service";
import { getPredictionAvailability } from "../../utils/predictionWindows";
import {
  niceCeil,
  ABSOLUTE_MAX_DOMESTIC_OPENING,
  ABSOLUTE_MAX_INTERNATIONAL_OPENING,
  ABSOLUTE_MAX_DOMESTIC_LIFETIME,
  ABSOLUTE_MAX_INTERNATIONAL_LIFETIME,
} from "../../utils/logScale";
import LogMoneySlider, { type PlaceFieldRegistry } from "./LogMoneySlider";
import RTScoreSlider from "./RTScoreSlider";
import LifetimeGroup from "./LifetimeGroup";
import { formatMillions } from "../../utils/formatMoney";
import { prefersReducedMotion } from "../../utils/viewTransitions";
import {
  CompMarkersByField,
  type CompMetricField,
  type PlaceCompMetric,
} from "../HistoricalComps/HistoricalComps";
import type { Guess } from "../../types";

/** Guest lock-in beats after Lock In (logged-out). */
export type GuestLockPhase = "idle" | "name" | "receipt";

interface PredictionControlsProps {
  movieId: string;
  availability: ReturnType<typeof getPredictionAvailability>;
  compMarkersByField?: CompMarkersByField;
  /** CompMovie.id highlighted from Historical Comps (linked brushing). */
  highlightedCompMovieId?: string | null;
  /** Clear pinned comps highlight (e.g. tick tap while brushing). */
  onDismissCompHighlight?: () => void;
  inviterName?: string;
  /** Controlled guest lock-in phase (shared across mobile/desktop mounts). */
  guestLockPhase: GuestLockPhase;
  /** Guest identity → receipt → seal; parent holds predict shell + quiets sheet. */
  onGuestLockPhaseChange: (phase: GuestLockPhase) => void;
  /** After a successful post — e.g. refetch the movie pool so ranks include the new guess. */
  onGuessLocked?: () => void;
  /**
   * Parent assigns this ref; we fill it with a place handler so the mobile
   * comps sheet can set one slider at a time without lifting all guess state.
   * Only one mounted instance should receive this (mobile) — desktop also mounts.
   */
  placeCompMetricRef?: MutableRefObject<PlaceCompMetric | null>;
}

const emptyMarkers: CompMarkersByField = {
  domesticOpening: [],
  internationalOpening: [],
  finalDomestic: [],
  finalInternational: [],
  rottenTomatoesScore: [],
};

const DOMESTIC_OPENING_FALLBACK = 300;
const INTERNATIONAL_OPENING_FALLBACK = 400;

function valuesFromGuess(guess: Guess | undefined) {
  if (!guess) {
    return {
      domesticOpening: null as number | null,
      internationalOpening: null as number | null,
      finalDomestic: null as number | null,
      finalInternational: null as number | null,
      rtScore: null as number | null,
    };
  }
  return {
    domesticOpening: toNumberOrNull(guess.domestic_opening),
    internationalOpening: toNumberOrNull(guess.international_opening),
    finalDomestic: toNumberOrNull(guess.final_domestic),
    finalInternational: toNumberOrNull(guess.final_international),
    rtScore: toNumberOrNull(guess.rotten_tomatoes_score),
  };
}

/** Guess fields can arrive as strings (Postgres BIGINT). */
function toNumberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function GuestPredictionSummary({
  domesticOpening,
  internationalOpening,
  worldwideOpening,
  finalDomestic,
  finalInternational,
  worldwideFinal,
  rtScore,
}: {
  domesticOpening: number | null;
  internationalOpening: number | null;
  worldwideOpening: number | null;
  finalDomestic: number | null;
  finalInternational: number | null;
  worldwideFinal: number | null;
  rtScore: number | null;
}) {
  const rows: { label: string; value: string; emph?: boolean }[] = [];
  if (domesticOpening != null) {
    rows.push({ label: "Domestic Opening", value: formatMillions(domesticOpening) });
  }
  if (internationalOpening != null) {
    rows.push({ label: "Intl Opening", value: formatMillions(internationalOpening) });
  }
  if (worldwideOpening != null) {
    rows.push({
      label: "WW Opening",
      value: formatMillions(worldwideOpening),
      emph: true,
    });
  }
  if (finalDomestic != null) {
    rows.push({ label: "Final Domestic", value: formatMillions(finalDomestic) });
  }
  if (finalInternational != null) {
    rows.push({ label: "Final Intl", value: formatMillions(finalInternational) });
  }
  if (worldwideFinal != null) {
    rows.push({
      label: "WW Final",
      value: formatMillions(worldwideFinal),
      emph: true,
    });
  }
  if (rtScore != null) {
    rows.push({ label: "Rotten Tomatoes", value: `${Math.round(rtScore)}%` });
  }

  if (rows.length === 0) return null;

  return (
    <div className="border border-ticket-ink/30 bg-ticket-ink/6 px-3 py-2.5 text-left">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ticket-ink/70">
        Your call
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm font-[Outfit,sans-serif]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt
              className={
                row.emph
                  ? "font-semibold text-ticket-ink/80"
                  : "text-ticket-ink/65"
              }
            >
              {row.label}
            </dt>
            <dd
              className={`text-right tabular-nums ${
                row.emph
                  ? "font-semibold text-ticket-ink"
                  : "font-medium text-ticket-ink"
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function PredictionControls({
  movieId,
  availability,
  compMarkersByField = emptyMarkers,
  highlightedCompMovieId = null,
  onDismissCompHighlight,
  inviterName,
  guestLockPhase,
  onGuestLockPhaseChange,
  onGuessLocked,
  placeCompMetricRef,
}: PredictionControlsProps) {
  const user = useUserStore((state) => state.user);
  const addGuess = useGuessStore((state) => state.addGuess);
  const existingGuess = useGuessStore((state) => state.getGuessForMovie(movieId));
  const inviterId = useInviteStore((s) => s.inviterId);
  const clearInvite = useInviteStore((s) => s.clearInvite);

  const initial = valuesFromGuess(existingGuess);

  const [domesticOpening, setDomesticOpening] = useState<number | null>(
    initial.domesticOpening,
  );
  const [internationalOpening, setInternationalOpening] = useState<number | null>(
    initial.internationalOpening,
  );
  /** Opening floors for lifetime — updated only after the opening gesture ends. */
  const [committedDomesticOpening, setCommittedDomesticOpening] = useState<
    number | null
  >(initial.domesticOpening);
  const [committedInternationalOpening, setCommittedInternationalOpening] =
    useState<number | null>(initial.internationalOpening);
  const [finalDomestic, setFinalDomestic] = useState<number | null>(
    initial.finalDomestic,
  );
  const [finalInternational, setFinalInternational] = useState<number | null>(
    initial.finalInternational,
  );
  const [rtScore, setRtScore] = useState<number | null>(initial.rtScore);

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const placeRegistry: PlaceFieldRegistry = useRef({});

  // Reset / hydrate from placed guess when the movie changes.
  const [loadedMovieId, setLoadedMovieId] = useState(movieId);
  if (loadedMovieId !== movieId) {
    setLoadedMovieId(movieId);
    const next = valuesFromGuess(existingGuess);
    setDomesticOpening(next.domesticOpening);
    setInternationalOpening(next.internationalOpening);
    setCommittedDomesticOpening(next.domesticOpening);
    setCommittedInternationalOpening(next.internationalOpening);
    setFinalDomestic(next.finalDomestic);
    setFinalInternational(next.finalInternational);
    setRtScore(next.rtScore);
    setMessage("");
  }

  useEffect(() => {
    async function triggerMutualFollow() {
      if (!user || !inviterId) return;
      try {
        await connectUsers(inviterId);
        clearInvite();
      } catch (err) {
        console.error("Failed to connect users", err);
      }
    }
    triggerMutualFollow();
  }, [user, inviterId, clearInvite]);

  // Mobile comps sheet: place one metric onto the matching slider (animated).
  useEffect(() => {
    if (!placeCompMetricRef) return;

    const fieldOpen = (field: CompMetricField) =>
      field === "rottenTomatoesScore"
        ? availability.rottenTomatoes
        : field === "domesticOpening"
          ? availability.domesticOpening
          : field === "internationalOpening"
            ? availability.internationalOpening
            : field === "finalDomestic"
              ? availability.finalDomestic
              : availability.finalInternational;

    const place: PlaceCompMetric = (field, raw) => {
      if (!Number.isFinite(raw) || !fieldOpen(field)) return;
      placeRegistry.current[field]?.(raw);
      navigator.vibrate?.(10);
    };

    placeCompMetricRef.current = place;
    return () => {
      placeCompMetricRef.current = null;
    };
  }, [placeCompMetricRef, availability, placeRegistry]);

  useEffect(() => {
    if (guestLockPhase !== "name") return;
    const el = document.querySelector("[data-predict-controls]");
    if (!(el instanceof HTMLElement)) return;
    el.scrollIntoView({
      behavior: prefersReducedMotion() ? "instant" : "smooth",
      block: "nearest",
    });
  }, [guestLockPhase]);

  const worldwideOpening =
    domesticOpening != null && internationalOpening != null
      ? domesticOpening + internationalOpening
      : null;
  const worldwideFinal =
    finalDomestic != null && finalInternational != null
      ? finalDomestic + finalInternational
      : null;

  const finalDomesticFallback = Math.min(
    ABSOLUTE_MAX_DOMESTIC_LIFETIME,
    committedDomesticOpening != null
      ? niceCeil(committedDomesticOpening * 3.5)
      : 600,
  );
  const finalInternationalFallback = Math.min(
    ABSOLUTE_MAX_INTERNATIONAL_LIFETIME,
    committedInternationalOpening != null
      ? niceCeil(committedInternationalOpening * 3.5)
      : 600,
  );

  const isFormValid = (() => {
    if (availability.domesticOpening && (domesticOpening == null || internationalOpening == null)) {
      return false;
    }
    if (availability.rottenTomatoes && rtScore == null) return false;
    return true;
  })();

  const submitGuess = async (userId: string): Promise<boolean> => {
    setIsSubmitting(true);
    setMessage("");
    try {
      const guessData = {
        user_id: userId,
        movie_id: movieId,
        domestic_opening: domesticOpening != null ? Math.round(domesticOpening) : null,
        international_opening:
          internationalOpening != null ? Math.round(internationalOpening) : null,
        final_domestic: finalDomestic != null ? Math.round(finalDomestic) : null,
        final_international:
          finalInternational != null ? Math.round(finalInternational) : null,
        rotten_tomatoes_score: rtScore != null ? Math.round(rtScore) : null,
      };

      const response = await postGuess(guessData);

      if (response.status === 201) {
        addGuess(response.data);
        onGuessLocked?.();
        return true;
      }
      setMessage("Failed to submit. Please try again.");
      return false;
    } catch {
      setMessage("Failed to submit. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    if (!user) {
      onGuestLockPhaseChange("name");
      return;
    }

    await submitGuess(user.id);
  };

  const handleGuestReceiptContinue = async () => {
    const createdUser = useUserStore.getState().user;
    if (!createdUser) {
      throw new Error("Missing user after signup");
    }

    // Keep the receipt mounted until submit succeeds so the stub can tear away.
    const ok = await submitGuess(createdUser.id);
    if (!ok) {
      throw new Error("Guess submit failed");
    }
  };

  const predictionSummary = (
    <GuestPredictionSummary
      domesticOpening={domesticOpening}
      internationalOpening={internationalOpening}
      worldwideOpening={worldwideOpening}
      finalDomestic={finalDomestic}
      finalInternational={finalInternational}
      worldwideFinal={worldwideFinal}
      rtScore={rtScore}
    />
  );

  if (guestLockPhase === "receipt") {
    return (
      <div data-predict-controls data-guest-lock="receipt">
        <UserConfirmation
          tearOnContinue
          continueLabel="See your locked prediction"
          continueBusyLabel="Locking in..."
          onDone={handleGuestReceiptContinue}
          onFinished={() => onGuestLockPhaseChange("idle")}
        />
      </div>
    );
  }

  if (guestLockPhase === "name") {
    return (
      <div
        data-predict-controls
        data-guest-lock="name"
        className="guest-step-enter space-y-5 text-left text-ticket-ink"
      >
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onGuestLockPhaseChange("idle")}
            className="inline-flex items-center gap-1.5 mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-ticket-ink/65 transition-colors hover:text-ticket-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ticket-ink"
          >
            <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
            Edit Prediction
          </button>
          {predictionSummary}
        </div>
        <UserSignup
          showBackButton={false}
          supportingLine={
            inviterName
              ? `So we can show you how you stack up with ${inviterName}.`
              : undefined
          }
          onSignup={() => onGuestLockPhaseChange("receipt")}
        />
      </div>
    );
  }

  return (
    <form
      data-predict-controls
      onSubmit={handleSubmit}
      className="space-y-6 text-ticket-ink"
    >
      {inviterName && (
        <div className="border-y border-ticket-ink/30 py-2 text-sm font-medium uppercase tracking-wide">
          {inviterName} wants you to predict how well this movie will do!
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold uppercase tracking-wide mb-1">Opening Weekend</h2>
        <p className="text-xs text-ticket-ink/65 mb-4 font-[Outfit,sans-serif]">
          Required before the box office deadline.
        </p>
        <div className="space-y-5">
          <div data-predict-field="domesticOpening">
            <LogMoneySlider
              id="domestic_opening"
              label="Domestic Opening"
              value={domesticOpening}
              onChange={setDomesticOpening}
              onCommit={setCommittedDomesticOpening}
              fallbackMax={DOMESTIC_OPENING_FALLBACK}
              absoluteMax={ABSOLUTE_MAX_DOMESTIC_OPENING}
              scaleKey={movieId}
              disabled={!availability.domesticOpening}
              compMarkers={compMarkersByField.domesticOpening}
              highlightedCompMovieId={highlightedCompMovieId}
              onDismissCompHighlight={onDismissCompHighlight}
              variant="ticket"
              placeField="domesticOpening"
              placeRegistry={placeRegistry}
            />
          </div>
          <div data-predict-field="internationalOpening">
            <LogMoneySlider
              id="international_opening"
              label="International Opening"
              value={internationalOpening}
              onChange={setInternationalOpening}
              onCommit={setCommittedInternationalOpening}
              fallbackMax={INTERNATIONAL_OPENING_FALLBACK}
              absoluteMax={ABSOLUTE_MAX_INTERNATIONAL_OPENING}
              scaleKey={movieId}
              disabled={!availability.internationalOpening}
              compMarkers={compMarkersByField.internationalOpening}
              highlightedCompMovieId={highlightedCompMovieId}
              onDismissCompHighlight={onDismissCompHighlight}
              variant="ticket"
              placeField="internationalOpening"
              placeRegistry={placeRegistry}
            />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-ticket-ink/30">
            <span className="text-sm uppercase tracking-wide text-ticket-ink/70">Worldwide Opening</span>
            <span className="text-base font-bold tabular-nums">
              {formatMillions(worldwideOpening)}
            </span>
          </div>
        </div>
      </div>

      <LifetimeGroup
        finalDomestic={finalDomestic}
        finalInternational={finalInternational}
        domesticOpening={committedDomesticOpening}
        internationalOpening={committedInternationalOpening}
        onFinalDomesticChange={setFinalDomestic}
        onFinalInternationalChange={setFinalInternational}
        disabled={!availability.finalDomestic}
        variant="ticket"
        scaleKey={movieId}
        finalDomesticFallback={finalDomesticFallback}
        finalInternationalFallback={finalInternationalFallback}
        finalDomesticMarkers={compMarkersByField.finalDomestic}
        finalInternationalMarkers={compMarkersByField.finalInternational}
        highlightedCompMovieId={highlightedCompMovieId}
        onDismissCompHighlight={onDismissCompHighlight}
        placeRegistry={placeRegistry}
      />

      <div data-predict-field="rottenTomatoesScore">
        <h2 className="text-2xl font-bold uppercase tracking-wide mb-4">Critical Reception</h2>
        <RTScoreSlider
          id="rotten_tomatoes"
          value={rtScore}
          onChange={setRtScore}
          disabled={!availability.rottenTomatoes}
          variant="ticket"
          compMarkers={compMarkersByField.rottenTomatoesScore}
          highlightedCompMovieId={highlightedCompMovieId}
          onDismissCompHighlight={onDismissCompHighlight}
          placeField="rottenTomatoesScore"
          placeRegistry={placeRegistry}
        />
      </div>

      <div className="flex items-end justify-between gap-4 pt-2">
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className={`flex-1 py-3 px-5 font-bold text-sm uppercase tracking-[0.15em] transition-opacity ${
            isFormValid
              ? "bg-ticket-ink text-ticket hover:opacity-90 active:opacity-80"
              : "bg-ticket-ink/25 text-ticket-ink/50 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? "Locking in..." : "Lock In Prediction"}
        </button>
      </div>

      {message && (
        <p className="text-sm text-center font-medium border border-ticket-ink/40 py-2" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
