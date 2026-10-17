import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

/** Track half-width (% of the meter) from the actual mark to either end. */
const EDGE = 46;
/** Percent error that reaches the end of the track; bigger misses pin there. */
const FULL_SCALE = 150;
/** Must match the tier cutoffs in `getAccuracyTier`. */
const NAILED_PCT = 5;
const CLOSE_PCT = 15;
/** Friend pins this close (in track %) to You get a second label row. */
const STACK_GAP = 4;
const TOOLTIP_EDGE_PAD = 8;

// Square-root scale: small misses stay distinguishable without huge misses running off the track.
const offset = (percentError: number) =>
  EDGE * Math.sqrt(Math.min(percentError, FULL_SCALE) / FULL_SCALE);

export type MissMeterOther = {
  id: string;
  name: string;
  delta: number;
  percentError: number;
  missAmount: string;
  /** Formatted guess for the tooltip, e.g. "$96M" or "84%". */
  guessLabel: string;
};

function measureTooltipShift(
  tooltipEl: HTMLElement,
  containerEl: HTMLElement,
  pad = TOOLTIP_EDGE_PAD
): number {
  const tipWidth = tooltipEl.offsetWidth;
  const anchor =
    tooltipEl.offsetParent instanceof HTMLElement
      ? tooltipEl.offsetParent
      : tooltipEl.parentElement;
  if (!anchor || tipWidth <= 0) return 0;

  const containerRect = containerEl.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const anchorCenter = anchorRect.left + anchorRect.width / 2;
  const idealLeft = anchorCenter - tipWidth / 2;
  const minLeft = containerRect.left + pad;
  const maxLeft = containerRect.right - pad - tipWidth;
  const clampedLeft = Math.min(
    Math.max(idealLeft, minLeft),
    Math.max(minLeft, maxLeft)
  );
  return clampedLeft - idealLeft;
}

const tooltipClass =
  "pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 whitespace-nowrap rounded border border-cinema-700 bg-cinema-900 px-1.5 py-0.5 text-center text-xs font-medium text-stone-200 shadow-md";

/** Miss distance on one track: the actual is the center mark, your guess lands under (left) or over (right). */
export default function MissMeter({
  delta,
  percentError,
  missAmount,
  pinClassName,
  revealDelayMs = 0,
  landingPulse = false,
  others = [],
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
  /** Friend pins on the same scale (max ~3; caller trims). */
  others?: MissMeterOther[];
}) {
  const direction = delta === 0 ? 0 : Math.sign(delta);
  const pinOffset = direction * offset(percentError);
  const pin = 50 + pinOffset;
  const nailedBand = offset(NAILED_PCT);
  const closeBand = offset(CLOSE_PCT);

  const friendPins = others.map((o) => {
    const dir = o.delta === 0 ? 0 : Math.sign(o.delta);
    const off = dir * offset(o.percentError);
    return { ...o, pinOffset: off, stacked: Math.abs(off - pinOffset) < STACK_GAP };
  });

  const yourBit =
    direction === 0
      ? "Your guess matched the actual exactly"
      : `Your guess was ${missAmount} ${direction > 0 ? "over" : "under"} the actual`;
  const friendBits = friendPins.map((o) => {
    const dir =
      o.delta === 0 ? "exact" : o.delta > 0 ? `${o.missAmount} over` : `${o.missAmount} under`;
    return o.delta === 0
      ? `${o.name} matched the actual exactly`
      : `${o.name} was ${dir}`;
  });
  const summary = [yourBit, ...friendBits].join("; ");

  const trackTall = friendPins.some((f) => f.stacked);
  const summaryId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [tooltipShift, setTooltipShift] = useState(0);
  const [tooltipReady, setTooltipReady] = useState(false);

  const openTooltip = (key: string) => {
    setTooltipReady(false);
    setTooltipShift(0);
    setOpenKey(key);
  };

  const closeTooltip = (key?: string) => {
    setOpenKey((k) => {
      if (key != null && k !== key) return k;
      return null;
    });
    setTooltipReady(false);
    setTooltipShift(0);
  };

  useLayoutEffect(() => {
    if (!openKey || !containerRef.current) {
      setTooltipShift(0);
      setTooltipReady(false);
      return;
    }
    const tip = containerRef.current.querySelector<HTMLElement>(
      `[data-tooltip-id="${CSS.escape(openKey)}"]`
    );
    if (!tip) {
      setTooltipShift(0);
      setTooltipReady(false);
      return;
    }
    setTooltipShift(measureTooltipShift(tip, containerRef.current));
    setTooltipReady(true);
  }, [openKey]);

  useEffect(() => {
    if (!openKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTooltip();
    };
    const onPtr = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) closeTooltip();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPtr);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPtr);
    };
  }, [openKey]);

  return (
    <div
      ref={containerRef}
      className="select-none"
      aria-describedby={summaryId}
      style={{ "--pin-x": `${pinOffset}%`, "--pin-delay": `${revealDelayMs}ms` } as CSSProperties}
      onMouseLeave={() => closeTooltip()}
    >
      <p id={summaryId} className="sr-only">
        {summary}
      </p>

      <div className={`relative ${trackTall ? "h-12" : "h-9"}`}>
        <div className="absolute inset-x-0 bottom-1.5 h-1.5 rounded-full bg-stone-700/40" aria-hidden>
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

        <div
          className="absolute bottom-0 left-1/2 h-4.5 w-0.5 -translate-x-1/2 rounded-full bg-theater-gold"
          aria-hidden
        />

        {friendPins.map((f, i) => {
          const tipText = `${f.name}: ${f.guessLabel}`;
          const isOpen = openKey === f.id;
          const showTooltip = isOpen && tooltipReady;
          return (
            <div
              key={f.id}
              className="miss-friend-pin absolute bottom-0.5 z-20"
              style={
                {
                  left: `${50 + f.pinOffset}%`,
                  transform: "translateX(-50%)",
                  "--friend-stagger": `${i * 60}ms`,
                } as CSSProperties
              }
            >
              <button
                type="button"
                className="relative flex min-h-8 min-w-8 flex-col items-center justify-end rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold"
                aria-label={tipText}
                aria-expanded={isOpen}
                onMouseEnter={() => openTooltip(f.id)}
                onFocus={() => openTooltip(f.id)}
                onBlur={() => closeTooltip(f.id)}
                onClick={() => {
                  if (openKey === f.id) closeTooltip(f.id);
                  else openTooltip(f.id);
                }}
              >
                <span
                  className={`absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider text-stone-400 ${
                    f.stacked ? "bottom-5" : "bottom-3.5"
                  }`}
                  aria-hidden
                >
                  {f.name.charAt(0)}
                </span>
                {/* Tooltip anchors to the pin, not the taller hit target. */}
                <span className="relative inline-flex">
                  <span
                    className="size-2.5 rounded-full border-2 border-stone-300 bg-cinema-900 ring-2 ring-cinema-950"
                    aria-hidden
                  />
                  <span
                    role="tooltip"
                    data-tooltip-id={f.id}
                    style={
                      isOpen
                        ? { transform: `translateX(calc(-50% + ${tooltipShift}px))` }
                        : { transform: "translateX(-50%)" }
                    }
                    className={`${tooltipClass} ${showTooltip ? "opacity-100" : "opacity-0"}`}
                  >
                    {tipText}
                  </span>
                </span>
              </button>
            </div>
          );
        })}

        {/* Full-width layer, so a % translate moves the pin and its label by % of the track. */}
        <div className="miss-pin absolute inset-0 z-10" aria-hidden>
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

      <div
        className="mt-1 grid grid-cols-3 text-[11px] uppercase tracking-wider text-stone-400"
        aria-hidden
      >
        <span className="text-left">Under</span>
        <span className="text-center text-theater-gold">Actual</span>
        <span className="text-right">Over</span>
      </div>

      {friendPins.length > 0 && (
        <ul className="miss-friend-legend mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-stone-400">
          {friendPins.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className="rounded-sm hover:text-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold"
                aria-label={`${f.name}: ${f.guessLabel}`}
                onMouseEnter={() => openTooltip(f.id)}
                onFocus={() => openTooltip(f.id)}
                onClick={() => {
                  if (openKey === f.id) closeTooltip(f.id);
                  else openTooltip(f.id);
                }}
              >
                <span className="font-semibold uppercase text-stone-300">
                  {f.name.charAt(0)}
                </span>
                <span className="mx-1 text-stone-600" aria-hidden>
                  ·
                </span>
                <span>{f.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
