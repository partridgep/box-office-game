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
    <form onSubmit={handleSubmit} className="space-y-6">
      {inviterName && (
        <div className="p-3 bg-cinema-800/80 text-theater-gold rounded-lg border border-theater-gold/20 text-sm font-medium">
          {inviterName} wants you to predict how well this movie will do!
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold font-ticketing text-stone-100 mb-1">Opening Weekend</h2>
        <p className="text-xs text-stone-500 mb-4">Required before the box office deadline.</p>
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
          />
          <LogMoneySlider
            id="international_opening"
            label="International Opening ($M)"
            value={internationalOpening}
            onChange={setInternationalOpening}
            min={1}
            max={250}
            disabled={!availability.internationalOpening}
          />
          <div className="flex items-center justify-between pt-2 border-t border-cinema-800">
            <span className="text-sm text-stone-400">Worldwide Opening</span>
            <span className="text-base font-bold text-theater-gold">
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
      />

      <div>
        <h2 className="text-2xl font-bold font-ticketing text-stone-100 mb-4">Critical Reception</h2>
        <RTScoreSlider
          value={rtScore}
          onChange={setRtScore}
          disabled={!availability.rottenTomatoes}
        />
      </div>

      <button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className={`w-full relative py-3 px-5 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-300 overflow-hidden ${
          isFormValid
            ? "bg-linear-to-b from-[#1a0818] via-[#0f040f] to-[#050105] border border-theater-gold/40 text-theater-gold shadow-[0_0_35px_rgba(230,197,103,0.2)] hover:shadow-[0_0_60px_rgba(230,197,103,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            : "bg-cinema-900 border border-cinema-700 text-stone-500 cursor-not-allowed"
        }`}
      >
        {isSubmitting ? "Locking in..." : "Lock In Prediction"}
      </button>

      {message && (
        <p className="text-sm text-green-400 text-center">{message}</p>
      )}
    </form>
  );
}
