import { useState, useEffect, useRef, type MutableRefObject } from "react";
import { useUserStore } from "../../store/useUserStore";
import { useGuessStore } from "../../store/useGuessStore";
import { useInviteStore } from "../../store/useInviteStore";
import { connectUsers } from "../../services/users.service";
import UserSignup from "../UserSignup/UserSignupPrompt";
import UserConfirmation from "../UserSignup/UserConfirmation";
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
import {
  CompMarkersByField,
  type CompMetricField,
  type PlaceCompMetric,
} from "../HistoricalComps/HistoricalComps";
import type { Guess } from "../../types";

interface PredictionControlsProps {
  movieId: string;
  availability: ReturnType<typeof getPredictionAvailability>;
  compMarkersByField?: CompMarkersByField;
  /** CompMovie.id highlighted from Historical Comps (linked brushing). */
  highlightedCompMovieId?: string | null;
  /** Clear pinned comps highlight (e.g. tick tap while brushing). */
  onDismissCompHighlight?: () => void;
  inviterName?: string;
  /** True while signup confirmation is showing — parent should keep this mounted. */
  onSignupFlowChange?: (active: boolean) => void;
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

export default function PredictionControls({
  movieId,
  availability,
  compMarkersByField = emptyMarkers,
  highlightedCompMovieId = null,
  onDismissCompHighlight,
  inviterName,
  onSignupFlowChange,
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

  const [showSignup, setShowSignup] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
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

  const worldwideOpening =
    domesticOpening != null && internationalOpening != null
      ? domesticOpening + internationalOpening
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    if (!user) {
      setShowSignup(true);
      return;
    }

    await submitGuess(user.id);
  };

  const submitGuess = async (userId: string) => {
    setIsSubmitting(true);
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
        setMessage("Your prediction is locked in!");
      } else {
        setMessage("Failed to submit. Please try again.");
      }
    } catch {
      setMessage("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSignup) {
    return (
      <UserSignup
        onSignup={() => {
          const createdUser = useUserStore.getState().user;
          onSignupFlowChange?.(true);
          setShowSignup(false);
          setShowConfirmation(true);
          if (createdUser) {
            void submitGuess(createdUser.id);
          }
        }}
        onCancel={() => setShowSignup(false)}
      />
    );
  }

  if (showConfirmation) {
    return (
      <UserConfirmation
        onDone={() => {
          setShowConfirmation(false);
          onSignupFlowChange?.(false);
        }}
      />
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
        <p className="text-sm text-center font-medium border border-ticket-ink/40 py-2">
          {message}
        </p>
      )}
    </form>
  );
}
