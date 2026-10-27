import React, { useEffect, useId, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { CAP_HEIGHT, layoutMarquee, type MarqueeBox, type MarqueeLayout } from '../utils/marqueeLetters';
import { enterTheater, prefersReducedMotion } from '../utils/viewTransitions';

interface PredictBoxOfficeButtonProps {
  /** Where the sign links to; without it the sign renders "powered off" and isn't interactive. */
  to?: string;
  movieTitle?: string;
}

const STROKE = 22;
const OUTLINE = 1.5;
const SHADOW = 3;
const PAD = 4;
const INNER_SHADOW = 3;
const BULB_RADIUS = 4.3;
// Must match the two-phase chase keyframes in index.css.
const CHASE_STEPS = 2;

// 15.4 is the widest spacing that still puts five bulbs (four gaps) on a full-height stem.
const LAYOUT_OPTIONS = { strokeWidth: STROKE, letterGap: 10, wordGap: 30, bulbSpacing: 15.4, lineGap: 16 };
const SINGLE_LINE = layoutMarquee(['PREDICT BOX OFFICE'], LAYOUT_OPTIONS);
const STACKED = layoutMarquee(['PREDICT', 'BOX OFFICE'], LAYOUT_OPTIONS);

const grow = (box: MarqueeBox, by: number) => ({
  x: box.x - by,
  y: box.y - by,
  width: box.width + 2 * by,
  height: box.height + 2 * by,
});

// Positive delays: every group holds at full brightness until its turn, so whenever the chase (re)starts
// (after power-on or hover) the sign eases down from fully lit instead of snapping to half-dim.
const chaseDelay = (step: number) =>
  `calc(var(--marquee-speed) * ${(step + CHASE_STEPS - 1) % CHASE_STEPS} / ${CHASE_STEPS})`;

// Power-on sequence: bulbs light in a left-to-right sweep; a couple of "faulty" ones stutter before catching.
// The stutter duration must match `marquee-power-stutter` in index.css.
const POWER_SWEEP_MS = 1100;
const POWER_STUTTER_MS = 750;
const POWER_ON_MS = POWER_SWEEP_MS + POWER_STUTTER_MS + 300;
const STUTTER_AT = [0.31, 0.74];

// Deterministic pseudo-random in [0, 1), so the sweep looks organic but renders the same every time.
const jitter = (seed: number) => {
  const v = Math.sin(seed * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

function powerOnTiming(layout: MarqueeLayout) {
  const total = layout.lines.reduce((sum, line) => sum + line.bulbs.length, 0);
  const stutterOrdinals = STUTTER_AT.map((at) => Math.floor(total * at));
  let ordinal = 0;
  return layout.lines.map((line) =>
    line.bulbs.map((b) => {
      const seed = ordinal++;
      const delay = ((line.x + b.x) / layout.width) * POWER_SWEEP_MS + (jitter(seed) - 0.5) * 120;
      return {
        className: stutterOrdinals.includes(seed) ? 'marquee-power marquee-power-stutter' : 'marquee-power',
        style: { '--power-delay': `${Math.max(0, Math.round(delay))}ms` } as React.CSSProperties,
      };
    })
  );
}

type PowerState = 'off' | 'booting' | 'on';

/** Plays the power-on sequence the first time the sign is mostly on screen; skipped for reduced motion. */
function usePowerOn(element: HTMLElement | null, enabled: boolean): PowerState {
  const [power, setPower] = useState<PowerState>(() => (prefersReducedMotion() ? 'on' : 'off'));

  useEffect(() => {
    if (!enabled || power !== 'off' || !element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          setPower('booting');
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, enabled, power]);

  useEffect(() => {
    if (power !== 'booting') return;
    const timeout = window.setTimeout(() => setPower('on'), POWER_ON_MS);
    return () => window.clearTimeout(timeout);
  }, [power]);

  return power;
}

function MarqueeSign({ layout, idPrefix, className }: { layout: MarqueeLayout; idPrefix: string; className: string }) {
  const ids = {
    fill: `${idPrefix}-fill`,
    bulb: `${idPrefix}-bulb`,
    unlitBulb: `${idPrefix}-unlit-bulb`,
    letterGlow: `${idPrefix}-letter-glow`,
    innerShadow: `${idPrefix}-inner-shadow`,
    halo: `${idPrefix}-halo`,
  };
  const view = {
    x: -OUTLINE - PAD,
    y: -STROKE / 2 - OUTLINE - PAD,
    width: layout.width + 2 * (OUTLINE + PAD),
    height: layout.height + STROKE + 2 * OUTLINE + SHADOW + 2 * PAD,
  };
  const power = useMemo(() => powerOnTiming(layout), [layout]);

  return (
    <svg
      aria-hidden="true"
      className={`relative overflow-visible ${className}`}
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id={ids.fill}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={-STROKE / 2}
          x2="0"
          y2={CAP_HEIGHT + STROKE / 2}
        >
          <stop offset="0%" stopColor="#f0612e" />
          <stop offset="55%" stopColor="#d84a22" />
          <stop offset="100%" stopColor="#b8321a" />
        </linearGradient>

        <radialGradient id={ids.bulb}>
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#fff3e0" />
          <stop offset="80%" stopColor="#ffc48a" />
          <stop offset="100%" stopColor="#ff9a4a" stopOpacity="0.6" />
        </radialGradient>

        <radialGradient id={ids.unlitBulb}>
          <stop offset="0%" stopColor="#c8642e" />
          <stop offset="60%" stopColor="#93381a" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#93381a" stopOpacity="0" />
        </radialGradient>

        <filter id={ids.letterGlow} x="-10%" y="-100%" width="120%" height="300%">
          <feGaussianBlur stdDeviation="8" />
        </filter>

        <filter id={ids.innerShadow} x="-5%" y="-50%" width="110%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>

        {/* Outputs only the halo; the bulb cores are drawn on top unfiltered. */}
        <filter id={ids.halo} x="-10%" y="-60%" width="120%" height="220%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="innerBlur" />
          <feFlood floodColor="#ffd9a8" floodOpacity="0.8" />
          <feComposite operator="in" in2="innerBlur" result="innerGlow" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="outerBlur" />
          <feFlood floodColor="#ff7a2a" floodOpacity="0.8" />
          <feComposite operator="in" in2="outerBlur" result="outerGlow" />
          <feMerge>
            <feMergeNode in="outerGlow" />
            <feMergeNode in="innerGlow" />
          </feMerge>
        </filter>

        {/* Square caps on diagonals (R, X) would poke past the letter, so each layer is clipped to letter boxes. */}
        {layout.lines.map((line, i) => (
          <React.Fragment key={i}>
            <clipPath id={`${idPrefix}-letter-clip-${i}`}>
              {line.boxes.map((box, j) => (
                <rect key={j} {...box} />
              ))}
            </clipPath>
            <clipPath id={`${idPrefix}-outline-clip-${i}`}>
              {line.boxes.map((box, j) => (
                <rect key={j} {...grow(box, OUTLINE)} />
              ))}
            </clipPath>
            <clipPath id={`${idPrefix}-inner-clip-${i}`}>
              {line.boxes.map((box, j) => (
                <rect key={j} {...grow(box, -INNER_SHADOW)} />
              ))}
            </clipPath>
          </React.Fragment>
        ))}
      </defs>

      {layout.lines.map((line, i) => {
        const strokeProps = {
          d: line.path,
          fill: 'none',
          strokeLinejoin: 'miter' as const,
          strokeLinecap: 'square' as const,
        };
        const letterClip = `url(#${idPrefix}-letter-clip-${i})`;
        const outlineClip = `url(#${idPrefix}-outline-clip-${i})`;
        const innerClip = `url(#${idPrefix}-inner-clip-${i})`;

        return (
          <g key={i} transform={`translate(${line.x} ${line.y})`}>
            <path
              {...strokeProps}
              className="marquee-letter-glow"
              stroke="#ff6a2a"
              strokeOpacity="0.44"
              strokeWidth={STROKE + 8}
              filter={`url(#${ids.letterGlow})`}
            />
            <g transform={`translate(0 ${SHADOW})`}>
              <path
                {...strokeProps}
                clipPath={outlineClip}
                stroke="#1a0802"
                strokeOpacity="0.7"
                strokeWidth={STROKE + 2 * OUTLINE}
              />
            </g>
            <path {...strokeProps} clipPath={outlineClip} stroke="#ffb07a" strokeWidth={STROKE + 2 * OUTLINE} />
            {/* Inner shadow: a dark letter, with the orange fill drawn narrower and blurred so its edge fades into it. */}
            <path {...strokeProps} clipPath={letterClip} stroke="#6e1a08" strokeWidth={STROKE} />
            <g clipPath={innerClip}>
              <path
                {...strokeProps}
                stroke={`url(#${ids.fill})`}
                strokeWidth={STROKE - 2 * INNER_SHADOW}
                filter={`url(#${ids.innerShadow})`}
              />
            </g>

            <g fill={`url(#${ids.unlitBulb})`}>
              {line.bulbs.map((b, j) => (
                <circle key={j} cx={b.x} cy={b.y} r={BULB_RADIUS} />
              ))}
            </g>

            {Array.from({ length: CHASE_STEPS }, (_, step) => {
              const bulbs = line.bulbs
                .map((b, j) => ({ ...b, power: power[i][j] }))
                .filter((b) => b.index % CHASE_STEPS === step);
              return (
                <g key={step} className="marquee-chase" style={{ animationDelay: chaseDelay(step) }}>
                  <g fill="#ffffff" filter={`url(#${ids.halo})`}>
                    {bulbs.map((b, j) => (
                      <circle key={j} cx={b.x} cy={b.y} r={BULB_RADIUS} {...b.power} />
                    ))}
                  </g>
                  <g fill={`url(#${ids.bulb})`}>
                    {bulbs.map((b, j) => (
                      <circle key={j} cx={b.x} cy={b.y} r={BULB_RADIUS} {...b.power} />
                    ))}
                  </g>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export default function PredictBoxOfficeButton({
  to,
  movieTitle,
}: PredictBoxOfficeButtonProps) {
  const id = useId().replace(/:/g, '');
  const [element, setElement] = useState<HTMLElement | null>(null);
  const power = usePowerOn(element, Boolean(to));
  const navigate = useNavigate();
  const [pressed, setPressed] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Let new-tab/window clicks and reduced-motion users through as a plain link.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (prefersReducedMotion() || !to) return;
    event.preventDefault();
    if (pressed) return;
    // Paint the marquee flash into the old snapshot, then crossfade into details.
    flushSync(() => setPressed(true));
    enterTheater(to, navigate);
  };

  const label = movieTitle ? `Predict box office for ${movieTitle}` : 'Predict box office';
  const wrapperClass = 'marquee-button group relative flex w-full rounded select-none';
  const panelClass =
    'relative flex flex-1 min-w-0 flex-col items-center justify-center px-4 sm:px-5 py-3 bg-linear-to-b from-[#26180c] via-[#150d06] to-[#0a0603] rounded border-2 overflow-hidden transition-[box-shadow,border-color] duration-300';

  const content = (enabled: boolean) => (
    <>
      <span
        className={`${panelClass} ${
          enabled
            ? 'border-[#ff9d5c]/35 shadow-[0_0_30px_rgba(255,122,42,0.12)] group-hover:border-[#ff9d5c]/60 group-hover:shadow-[0_0_60px_rgba(255,122,42,0.35)] group-focus-visible:shadow-[0_0_60px_rgba(255,122,42,0.35)]'
            : 'border-[#ff9d5c]/15'
        }`}
      >
        <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-orange-500/15 via-orange-900/5 to-transparent opacity-60 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-500" />
        <MarqueeSign layout={STACKED} idPrefix={`${id}-stacked`} className="block h-auto w-full max-w-sm sm:hidden" />
        <MarqueeSign layout={SINGLE_LINE} idPrefix={`${id}-single`} className="hidden h-12 w-full sm:block" />
      </span>
    </>
  );

  if (!to) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label={`${label} (unavailable)`}
        className={`${wrapperClass} marquee-off cursor-not-allowed`}
      >
        {content(false)}
      </span>
    );
  }

  return (
    <Link
      ref={setElement}
      to={to}
      onClick={handleClick}
      data-power={power}
      data-pressed={pressed || undefined}
      aria-label={label}
      className={`${wrapperClass} transition-transform duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb07a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0203] cursor-pointer`}
    >
      {content(true)}
    </Link>
  );
}
