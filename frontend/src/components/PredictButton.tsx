import React, { useId } from 'react';
import { CAP_HEIGHT, layoutMarquee, type MarqueeBox } from '../utils/marqueeLetters';

interface PredictBoxOfficeButtonProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const LABEL = 'PREDICT BOX OFFICE';
const STROKE = 22;
const RIM = 3;
const SHEEN_INSET = 4;
const EXTRUDE = 6;
const PAD = 4;
const BULB_RADIUS = 5.1;
// Must match the two-phase keyframes in index.css.
const CHASE_STEPS = 2;

const MARQUEE = layoutMarquee(LABEL, { strokeWidth: STROKE, letterGap: 10, wordGap: 30, bulbSpacing: 13 });

const VIEW = {
  x: -RIM - PAD,
  y: -STROKE / 2 - RIM - PAD,
  width: MARQUEE.width + 2 * (RIM + PAD),
  height: CAP_HEIGHT + STROKE + 2 * RIM + EXTRUDE + 2 * PAD,
};

const BULB_GROUPS = Array.from({ length: CHASE_STEPS }, (_, step) =>
  MARQUEE.bulbs.filter((_, i) => i % CHASE_STEPS === step)
);

const EXTRUSION = [
  { dy: 6, color: '#1f0204' },
  { dy: 4, color: '#3a050a' },
  { dy: 2, color: '#5c0a12' },
];

const chaseDelay = (step: number) =>
  `calc(var(--marquee-speed) * ${-((CHASE_STEPS - step) % CHASE_STEPS)} / ${CHASE_STEPS})`;

const grow = (box: MarqueeBox, by: number) => ({
  x: box.x - by,
  y: box.y - by,
  width: box.width + 2 * by,
  height: box.height + 2 * by,
});

export default function PredictBoxOfficeButton({ onClick }: PredictBoxOfficeButtonProps) {
  const id = useId().replace(/:/g, '');
  const ids = {
    gold: `${id}-gold`,
    red: `${id}-red`,
    sheen: `${id}-sheen`,
    glow: `${id}-glow`,
    bulb: `${id}-bulb`,
    unlitBulb: `${id}-unlit-bulb`,
    letterClip: `${id}-letter-clip`,
    rimClip: `${id}-rim-clip`,
    sheenClip: `${id}-sheen-clip`,
  };

  const strokeProps = {
    d: MARQUEE.path,
    fill: 'none',
    strokeLinejoin: 'miter' as const,
    strokeLinecap: 'square' as const,
  };

  return (
    <button
      onClick={onClick}
      type="button"
      aria-label="Predict box office"
      className="marquee-button w-full group relative inline-flex items-center justify-center px-5 py-2 bg-linear-to-b from-[#1a0818] via-[#0f040f] to-[#050105] rounded-2xl border border-[#f5d77f]/40 shadow-[0_0_35px_rgba(245,215,127,0.2)] hover:shadow-[0_0_60px_rgba(245,215,127,0.4)] hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d77f] transition-all duration-300 cursor-pointer overflow-hidden select-none"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

      <svg
        aria-hidden="true"
        className="relative z-5 w-full h-10 sm:h-12 drop-shadow-[0_8px_4px_rgba(0,0,0,0.8)]"
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id={ids.gold}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={-STROKE / 2 - RIM}
            x2="0"
            y2={CAP_HEIGHT + STROKE / 2 + RIM}
          >
            <stop offset="0%" stopColor="#fff1a8" />
            <stop offset="30%" stopColor="#f3be48" />
            <stop offset="70%" stopColor="#b8860b" />
            <stop offset="100%" stopColor="#6e4f04" />
          </linearGradient>

          <linearGradient
            id={ids.red}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={-STROKE / 2}
            x2="0"
            y2={CAP_HEIGHT + STROKE / 2}
          >
            <stop offset="0%" stopColor="#cb242e" />
            <stop offset="50%" stopColor="#9e111a" />
            <stop offset="100%" stopColor="#61080e" />
          </linearGradient>

          <linearGradient id={ids.sheen} gradientUnits="userSpaceOnUse" x1="0" y1={-STROKE / 2} x2="0" y2={CAP_HEIGHT}>
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <filter
            id={ids.glow}
            filterUnits="userSpaceOnUse"
            x={VIEW.x}
            y={VIEW.y}
            width={VIEW.width}
            height={VIEW.height}
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="innerBlur" />
            <feFlood floodColor="#fff59d" />
            <feComposite operator="in" in2="innerBlur" result="innerGlow" />
            <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="outerBlur" />
            <feFlood floodColor="#ffb300" />
            <feComposite operator="in" in2="outerBlur" result="outerGlow" />
            <feMerge>
              <feMergeNode in="outerGlow" />
              <feMergeNode in="outerGlow" />
              <feMergeNode in="innerGlow" />
              <feMergeNode in="innerGlow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id={ids.bulb}>
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#fff8d6" />
            <stop offset="100%" stopColor="#ffd56a" stopOpacity="0.75" />
          </radialGradient>

          <radialGradient id={ids.unlitBulb}>
            <stop offset="0%" stopColor="#a8762a" />
            <stop offset="60%" stopColor="#7a5418" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7a5418" stopOpacity="0" />
          </radialGradient>

          {/* Square caps on diagonals (R, X) would poke past the letter, so each layer is clipped to letter boxes. */}
          <clipPath id={ids.letterClip}>
            {MARQUEE.boxes.map((box, i) => (
              <rect key={i} {...box} />
            ))}
          </clipPath>
          <clipPath id={ids.rimClip}>
            {MARQUEE.boxes.map((box, i) => (
              <rect key={i} {...grow(box, RIM)} />
            ))}
          </clipPath>
          <clipPath id={ids.sheenClip}>
            {MARQUEE.boxes.map((box, i) => (
              <rect key={i} {...grow(box, -SHEEN_INSET)} />
            ))}
          </clipPath>
        </defs>

        {EXTRUSION.map(({ dy, color }) => (
          <g key={dy} transform={`translate(0 ${dy})`}>
            <path {...strokeProps} clipPath={`url(#${ids.rimClip})`} stroke={color} strokeWidth={STROKE + 2 * RIM} />
          </g>
        ))}

        <path {...strokeProps} clipPath={`url(#${ids.rimClip})`} stroke={`url(#${ids.gold})`} strokeWidth={STROKE + 2 * RIM} />
        <path {...strokeProps} clipPath={`url(#${ids.letterClip})`} stroke={`url(#${ids.red})`} strokeWidth={STROKE} />
        <path
          {...strokeProps}
          clipPath={`url(#${ids.sheenClip})`}
          stroke={`url(#${ids.sheen})`}
          strokeWidth={STROKE - 2 * SHEEN_INSET}
        />

        <g fill="#2a0306" fillOpacity="0.45">
          {MARQUEE.bulbs.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r={BULB_RADIUS + 1} />
          ))}
        </g>
        <g fill={`url(#${ids.unlitBulb})`}>
          {MARQUEE.bulbs.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r={BULB_RADIUS} />
          ))}
        </g>

        {BULB_GROUPS.map((group, step) => (
          <g
            key={step}
            className="marquee-bulbs"
            fill={`url(#${ids.bulb})`}
            filter={`url(#${ids.glow})`}
            style={{ animationDelay: chaseDelay(step) }}
          >
            {group.map((b, i) => (
              <circle key={i} cx={b.x} cy={b.y} r={BULB_RADIUS} />
            ))}
          </g>
        ))}
      </svg>
    </button>
  );
}
