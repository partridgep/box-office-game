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
        <p className="text-xs font-semibold uppercase tracking-wider text-theater-gold/70">
          {label}
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {guess.domestic_opening != null && (
          <>
            <span className="text-stone-500">Domestic Opening</span>
            <span className="text-stone-200 font-medium text-right">
              {formatMillions(guess.domestic_opening)}
            </span>
          </>
        )}
        {guess.international_opening != null && (
          <>
            <span className="text-stone-500">Intl Opening</span>
            <span className="text-stone-200 font-medium text-right">
              {formatMillions(guess.international_opening)}
            </span>
          </>
        )}
        {worldwideOpening != null && (
          <>
            <span className="text-stone-500">WW Opening</span>
            <span className="text-theater-gold font-semibold text-right">
              {formatMillions(worldwideOpening)}
            </span>
          </>
        )}
        {guess.final_domestic != null && (
          <>
            <span className="text-stone-500">Final Domestic</span>
            <span className="text-stone-200 font-medium text-right">
              {formatMillions(guess.final_domestic)}
            </span>
          </>
        )}
        {guess.final_international != null && (
          <>
            <span className="text-stone-500">Final Intl</span>
            <span className="text-stone-200 font-medium text-right">
              {formatMillions(guess.final_international)}
            </span>
          </>
        )}
        {worldwideFinal != null && (
          <>
            <span className="text-stone-500">WW Final</span>
            <span className="text-theater-gold font-semibold text-right">
              {formatMillions(worldwideFinal)}
            </span>
          </>
        )}
        {guess.rotten_tomatoes_score != null && (
          <>
            <span className="text-stone-500">Rotten Tomatoes</span>
            <span className="text-stone-200 font-medium text-right">
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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-stone-100 mb-1">
          Prediction Locked In
        </h2>
        <p className="text-xs text-stone-500">
          Results will appear here once official data is available.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-cinema-900/50 border border-theater-gold/20">
        <PredictionRows guess={guess} label="Your Predictions" />
      </div>

      {showFriend && (
        <div className="p-4 rounded-xl bg-cinema-900/30 border border-cinema-800">
          <PredictionRows
            guess={friendGuess}
            label={`${friendGuess.guess_user?.name ?? "Friend"}'s Predictions`}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onShareClick}
        className="w-full py-3 px-5 rounded-2xl font-bold text-sm uppercase tracking-wider bg-cinema-800 border border-theater-gold/30 text-theater-gold hover:bg-cinema-700 hover:border-theater-gold/50 transition-all"
      >
        Challenge a Friend
      </button>
    </div>
  );
}
