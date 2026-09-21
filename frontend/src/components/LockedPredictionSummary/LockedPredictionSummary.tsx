import { Guess } from "../../types";
import { formatMillions } from "../../utils/formatMoney";

interface LockedPredictionSummaryProps {
  guess: Guess;
  friendGuess?: Guess;
  onShareClick: () => void;
}

function PredictionRows({ guess, label }: { guess: Guess; label?: string }) {
  const worldwideOpening =
    guess.domestic_opening && guess.international_opening
      ? Number(guess.domestic_opening) + Number(guess.international_opening)
      : null;
  const worldwideFinal =
    guess.final_domestic && guess.final_international
      ? Number(guess.final_domestic) + Number(guess.final_international)
      : null;

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold uppercase tracking-wider text-ticket-ink/70">
          {label}
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm font-[Outfit,sans-serif] text-left">
        {guess.domestic_opening != null && (
          <>
            <span className="text-ticket-ink/65">Domestic Opening</span>
            <span className="text-ticket-ink font-medium text-right">
              {formatMillions(guess.domestic_opening)}
            </span>
          </>
        )}
        {guess.international_opening != null && (
          <>
            <span className="text-ticket-ink/65">Intl Opening</span>
            <span className="text-ticket-ink font-medium text-right">
              {formatMillions(guess.international_opening)}
            </span>
          </>
        )}
        {worldwideOpening != null && (
          <>
            <span className="text-ticket-ink/65 font-semibold">WW Opening</span>
            <span className="text-ticket-ink font-semibold text-right">
              {formatMillions(worldwideOpening)}
            </span>
          </>
        )}
        {guess.final_domestic != null && (
          <>
            <span className="text-ticket-ink/65">Final Domestic</span>
            <span className="text-ticket-ink font-medium text-right">
              {formatMillions(guess.final_domestic)}
            </span>
          </>
        )}
        {guess.final_international != null && (
          <>
            <span className="text-ticket-ink/65">Final Intl</span>
            <span className="text-ticket-ink font-medium text-right">
              {formatMillions(guess.final_international)}
            </span>
          </>
        )}
        {worldwideFinal != null && (
          <>
            <span className="text-ticket-ink/65 font-semibold">WW Final</span>
            <span className="text-ticket-ink font-semibold text-right">
              {formatMillions(worldwideFinal)}
            </span>
          </>
        )}
        {guess.rotten_tomatoes_score != null && (
          <>
            <span className="text-ticket-ink/65">Rotten Tomatoes</span>
            <span className="text-ticket-ink font-medium text-right">
              {guess.rotten_tomatoes_score}%
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function LockedPredictionSummary({
  guess,
  friendGuess,
  onShareClick,
}: LockedPredictionSummaryProps) {
  const showFriend =
    friendGuess && friendGuess.user_id !== guess.user_id;

  return (
    <div className="space-y-6 text-ticket-ink">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-wide mb-1">
          Prediction Locked In
        </h2>
        <p className="text-xs text-ticket-ink/65 font-[Outfit,sans-serif]">
          Results will appear here once official data is available.
        </p>
      </div>

      <div className="p-4 border border-ticket-ink/30 bg-ticket-ink/6">
        <PredictionRows guess={guess} label="Your Predictions" />
      </div>

      {showFriend && (
        <div className="p-4 border border-ticket-ink/20 bg-ticket-ink/4">
          <PredictionRows
            guess={friendGuess}
            label={`${friendGuess.guess_user?.name ?? "Friend"}'s Predictions`}
          />
        </div>
      )}

      <div className="flex items-end justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onShareClick}
          className="flex-1 py-3 px-5 font-bold text-sm uppercase tracking-[0.15em] bg-ticket-ink text-ticket hover:opacity-90 transition-opacity"
        >
          Challenge a Friend
        </button>
      </div>
    </div>
  );
}
