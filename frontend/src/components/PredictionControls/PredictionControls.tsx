import { useState, useEffect } from "react";
import { useUserStore } from "../../store/useUserStore";
import { useGuessStore } from "../../store/useGuessStore";
import { useInviteStore } from "../../store/useInviteStore";
import { connectUsers } from "../../services/users.service";
import UserSignup from "../UserSignup/UserSignupPrompt";
import UserConfirmation from "../UserSignup/UserConfirmation";
import { postGuess } from "../../services/guesses.service";
import { getPredictionAvailability } from "../../utils/predictionWindows";
import LogMoneySlider, { CompMarker } from "./LogMoneySlider";
import RTScoreSlider from "./RTScoreSlider";
import LifetimeGroup from "./LifetimeGroup";
import { formatMillions } from "../../utils/formatMoney";

interface PredictionControlsProps {
  movieId: string;
  availability: ReturnType<typeof getPredictionAvailability>;
  compMarkers?: CompMarker[];
  inviterName?: string;
  domesticOpeningSeed?: number;
}

export default function PredictionControls({
  movieId,
  availability,
  compMarkers = [],
  inviterName,
  domesticOpeningSeed,
}: PredictionControlsProps) {
  const user = useUserStore((state) => state.user);
  const addGuess = useGuessStore((state) => state.addGuess);
  const inviterId = useInviteStore((s) => s.inviterId);
  const clearInvite = useInviteStore((s) => s.clearInvite);

  const [domesticOpening, setDomesticOpening] = useState<number | null>(50);
  const [internationalOpening, setInternationalOpening] = useState<number | null>(25);
  const [finalDomestic, setFinalDomestic] = useState<number | null>(null);
  const [finalInternational, setFinalInternational] = useState<number | null>(null);
  const [rtScore, setRtScore] = useState<number | null>(75);

  const [showSignup, setShowSignup] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (domesticOpeningSeed != null) {
      setDomesticOpening(domesticOpeningSeed);
    }
  }, [domesticOpeningSeed]);

  const worldwideOpening =
    domesticOpening != null && internationalOpening != null
      ? domesticOpening + internationalOpening
      : null;

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

    setIsSubmitting(true);
    try {
      const guessData = {
        user_id: user.id,
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
          setShowSignup(false);
          setShowConfirmation(true);
        }}
      />
    );
  }

  if (showConfirmation) {
    return (
      <UserConfirmation
        onDone={() => setShowConfirmation(false)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-ticket-ink">
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
          <LogMoneySlider
            id="domestic_opening"
            label="Domestic Opening ($M)"
            value={domesticOpening}
            onChange={setDomesticOpening}
            min={1}
            max={250}
            disabled={!availability.domesticOpening}
            compMarkers={compMarkers}
            variant="ticket"
          />
          <LogMoneySlider
            id="international_opening"
            label="International Opening ($M)"
            value={internationalOpening}
            onChange={setInternationalOpening}
            min={1}
            max={250}
            disabled={!availability.internationalOpening}
            variant="ticket"
          />
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
        domesticOpening={domesticOpening}
        internationalOpening={internationalOpening}
        onFinalDomesticChange={setFinalDomestic}
        onFinalInternationalChange={setFinalInternational}
        disabled={!availability.finalDomestic}
        variant="ticket"
      />

      <div>
        <h2 className="text-2xl font-bold uppercase tracking-wide mb-4">Critical Reception</h2>
        <RTScoreSlider
          value={rtScore}
          onChange={setRtScore}
          disabled={!availability.rottenTomatoes}
          variant="ticket"
        />
      </div>

      <div className="flex items-end justify-between gap-4 pt-2">
        <span className="text-6xl font-bold leading-none select-none" aria-hidden>
          1
        </span>
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
        <div
          className="shrink-0 w-12 h-12 bg-ticket-ink text-ticket flex items-center justify-center text-sm font-bold uppercase"
          aria-hidden
        >
          NR
        </div>
      </div>

      {message && (
        <p className="text-sm text-center font-medium border border-ticket-ink/40 py-2">
          {message}
        </p>
      )}
    </form>
  );
}
