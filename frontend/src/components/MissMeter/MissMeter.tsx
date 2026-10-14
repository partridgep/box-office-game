import type { CSSProperties } from "react";

/** Track half-width (% of the meter) from the actual mark to either end. */
const EDGE = 46;
/** Percent error that reaches the end of the track; bigger misses pin there. */
const FULL_SCALE = 150;
/** Must match the tier cutoffs in `getAccuracyTier`. */
const NAILED_PCT = 5;
const CLOSE_PCT = 15;

// Square-root scale: small misses stay distinguishable without huge misses running off the track.
const offset = (percentError: number) =>
  EDGE * Math.sqrt(Math.min(percentError, FULL_SCALE) / FULL_SCALE);

/** Miss distance on one track: the actual is the center mark, your guess lands under (left) or over (right). */
export default function MissMeter({
  delta,
  percentError,
  missAmount,
  pinClassName,
  revealDelayMs = 0,
  landingPulse = false,
}: {
  /** Guess minus actual. */
  delta: number;
  /** Positions the pin. */
  percentError: number;
  /** How far the guess missed, as worded in the card's badge (e.g. "67%"). */
  missAmount: string;
  /** Background class for the pin and the shaded miss. */
  pinClassName: string;
  /**
   * Inside a `.backlit-scope`, the pin waits on the actual mark while the board is dark, then slides out as the
   * backlight starts, offset by this delay (staggers cards in a group).
   */
  revealDelayMs?: number;
  /** One soft pulse as the pin lands; reserved for nailed guesses. */
  landingPulse?: boolean;
}) {
  const direction = delta === 0 ? 0 : Math.sign(delta);
  const pinOffset = direction * offset(percentError);
  const pin = 50 + pinOffset;
  const nailedBand = offset(NAILED_PCT);
  const closeBand = offset(CLOSE_PCT);

  const summary =
    direction === 0
      ? "Your guess matched the actual exactly"
      : `Your guess was ${missAmount} ${direction > 0 ? "over" : "under"} the actual`;

  return (
    <div
      role="img"
      aria-label={summary}
      className="select-none"
      style={{ "--pin-x": `${pinOffset}%`, "--pin-delay": `${revealDelayMs}ms` } as CSSProperties}
    >
      <div className="relative h-9">
        <div className="absolute inset-x-0 bottom-1.5 h-1.5 rounded-full bg-stone-700/40">
          <div
            className="absolute inset-y-0 bg-theater-gold/10"
            style={{ left: `${50 - closeBand}%`, width: `${2 * closeBand}%` }}
          />
          <div
            className="absolute inset-y-0 bg-theater-gold/25"
            style={{ left: `${50 - nailedBand}%`, width: `${2 * nailedBand}%` }}
          />
          <div
            className={`miss-fill absolute inset-y-0 opacity-60 ${pinClassName}`}
            style={{
              left: `${Math.min(50, pin)}%`,
              width: `${Math.abs(pinOffset)}%`,
              transformOrigin: direction > 0 ? "left" : "right",
            }}
          />
        </div>

        <div className="absolute bottom-0 left-1/2 h-4.5 w-0.5 -translate-x-1/2 rounded-full bg-theater-gold" />

        {/* Full-width layer, so a % translate moves the pin and its label by % of the track. */}
        <div className="miss-pin absolute inset-0">
          <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-wider text-stone-200">
            You
          </span>
          <div
            className={`absolute bottom-0.5 left-1/2 size-3.5 -translate-x-1/2 rounded-full ring-2 ring-cinema-950 ${
              landingPulse ? "miss-pin-pulse" : ""
            } ${pinClassName}`}
          />
        </div>
      </div>

      <div className="mt-1 grid grid-cols-3 text-[11px] uppercase tracking-wider text-stone-400">
        <span className="text-left">Under</span>
        <span className="text-center text-theater-gold">Actual</span>
        <span className="text-right">Over</span>
      </div>
    </div>
  );
}
