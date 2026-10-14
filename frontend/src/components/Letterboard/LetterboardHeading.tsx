import { useEffect, useState, type AnimationEvent, type CSSProperties } from "react";

// Deterministic pseudo-random in [0, 1), so letters look hand-hung but render the same every time.
const jitter = (seed: number) => {
  const v = Math.sin(seed * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

const seedFor = (text: string) =>
  [...text].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

function letterStyle(seed: number): CSSProperties {
  const tilt = (jitter(seed) - 0.5) * 0.3;
  const drop = jitter(seed * 7) > 0.33 ? 0.01 : (jitter(seed * 3) - 0.5) * 0.005;
  return {
    "--tilt": `${tilt.toFixed(2)}deg`,
    "--drop": `${drop.toFixed(3)}em`,
  } as CSSProperties;
}

/**
 * Inline style for the element wrapping a board and anything it lights (`.backlit-scope`), so they share one
 * power-on delay. Boards that enter view together shouldn't flicker in lockstep.
 */
export const backlightDelay = (text: string) =>
  ({ "--power-delay": `${Math.round(jitter(seedFor(text)) * 250)}ms` }) as CSSProperties;

type PowerState = "off" | "booting" | "on";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Flickers the backlight on the first time the board is mostly on screen; skipped for reduced motion. */
function useBacklight(element: HTMLElement | null) {
  const [power, setPower] = useState<PowerState>(() => (prefersReducedMotion() ? "on" : "off"));

  useEffect(() => {
    if (power !== "off" || !element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          setPower("booting");
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, power]);

  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) setPower("on");
  };

  return { power, onAnimationEnd };
}

/**
 * Heading styled as a backlit changeable-letter marquee board. `.backlit` elements inside the same
 * `.backlit-scope` power on with it.
 */
export default function LetterboardHeading({
  children,
  as: Tag = "h3",
  className = "",
}: {
  children: string;
  as?: "h2" | "h3" | "h4";
  className?: string;
}) {
  const base = seedFor(children);
  let index = 0;
  const [element, setElement] = useState<HTMLElement | null>(null);
  const { power, onAnimationEnd } = useBacklight(element);

  return (
    <Tag
      ref={setElement}
      data-power={power}
      onAnimationEnd={onAnimationEnd}
      className={`letterboard ${className}`}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" className="letterboard-rows">
        {children
          .toUpperCase()
          .split(" ")
          .map((word, w) => (
            <span key={w} className="letterboard-word">
              {[...word].map((ch) => {
                const seed = base + ++index;
                return (
                  <span key={seed} className="letterboard-letter" style={letterStyle(seed)}>
                    {ch}
                  </span>
                );
              })}
            </span>
          ))}
      </span>
    </Tag>
  );
}
