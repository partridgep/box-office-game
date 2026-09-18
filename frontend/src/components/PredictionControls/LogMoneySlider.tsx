import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Lock } from "lucide-react";
import {
  valueToPosition,
  snapToDetent,
  snapToWholeMagnet,
  roundToTenth,
  FAST_SLIDE_SPEED,
  SLOW_SLIDE_SPEED,
  EDGE_EXPAND_RATIO,
  initialMoneyMax,
  fitMaxForValue,
  OVERSHOOT_PX_PER_MILLION,
  OVERSHOOT_MAX_DELTA,
  OVERSHOOT_TICK_MS,
  EXPAND_ANIM_MS,
  growMaxForOvershoot,
} from "../../utils/logScale";
import { formatMillions } from "../../utils/formatMoney";
import CompMarkers, { type CompMarker } from "./CompMarkers";

export type { CompMarker };

const MIN = 0;

interface LogMoneySliderProps {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  /** Used when comps are empty (and as a floor for the initial fit). */
  fallbackMax: number;
  /** Hard ceiling — value and max cannot exceed this. */
  absoluteMax: number;
  /** Reset the scale when this changes (e.g. movie id). */
  scaleKey?: string;
  disabled?: boolean;
  compMarkers?: CompMarker[];
  id?: string;
  variant?: "default" | "ticket";
}

export default function LogMoneySlider({
  label,
  value,
  onChange,
  fallbackMax,
  absoluteMax,
  scaleKey,
  disabled = false,
  compMarkers = [],
  id,
  variant = "default",
}: LogMoneySliderProps) {
  const markerSignature = useMemo(
    () =>
      compMarkers
        .map((m) => m.value)
        .filter((v) => Number.isFinite(v) && v > 0)
        .sort((a, b) => a - b)
        .join(","),
    [compMarkers],
  );

  const fittedMax = useMemo(
    () => initialMoneyMax(compMarkers, fallbackMax, absoluteMax),
    // markerSignature captures comps; fallbackMax / absoluteMax are explicit
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markerSignature, fallbackMax, absoluteMax],
  );

  const withinAbsolute = (m: number) => Math.min(m, absoluteMax);

  const [max, setMax] = useState(() =>
    withinAbsolute(
      value != null
        ? Math.max(fittedMax, fitMaxForValue(value, fittedMax, absoluteMax))
        : fittedMax,
    ),
  );
  const initialMaxRef = useRef(fittedMax);
  const maxRef = useRef(max);
  maxRef.current = max;
  const valueRef = useRef(value);
  valueRef.current = value;
  const userExpandedRef = useRef(false);
  const lastOvershootTickRef = useRef(0);
  const expandLockRef = useRef(false);
  const expandAnimRef = useRef<number | null>(null);

  /** While set, drives the thumb so it can ease left after a max expand. */
  const [expandVisual, setExpandVisual] = useState<number | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputWidth, setInputWidth] = useState<number | undefined>();
  const measureRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastWholeRef = useRef<number | null>(null);
  const velocityRef = useRef({ lastValue: 0, lastTime: 0, speed: 0 });
  const isTicket = variant === "ticket";

  const cancelExpandAnim = () => {
    if (expandAnimRef.current != null) {
      cancelAnimationFrame(expandAnimRef.current);
      expandAnimRef.current = null;
    }
    expandLockRef.current = false;
    setExpandVisual(null);
  };

  /**
   * After max grows, hold the thumb at the old % on the new scale, then ease
   * it left to the real value so the expand reads as “range grew.”
   */
  const animateThumbAfterExpand = (
    oldMax: number,
    newMax: number,
    fromValue: number,
    toValue: number,
  ) => {
    if (oldMax <= 0 || newMax <= oldMax) return;

    if (expandAnimRef.current != null) {
      cancelAnimationFrame(expandAnimRef.current);
    }

    const startVisual = Math.min(newMax, (fromValue / oldMax) * newMax);
    const endVisual = Math.min(newMax, toValue);
    expandLockRef.current = true;
    setExpandVisual(startVisual);

    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / EXPAND_ANIM_MS);
      const eased = 1 - (1 - t) ** 2; // ease-out quad
      const v = startVisual + (endVisual - startVisual) * eased;
      setExpandVisual(v);
      if (t < 1) {
        expandAnimRef.current = requestAnimationFrame(tick);
      } else {
        expandAnimRef.current = null;
        expandLockRef.current = false;
        setExpandVisual(null);
      }
    };
    expandAnimRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelExpandAnim(), []);

  // Hard reset when the movie (or other scale key) changes.
  useEffect(() => {
    cancelExpandAnim();
    userExpandedRef.current = false;
    initialMaxRef.current = fittedMax;
    setMax(
      withinAbsolute(
        value != null && value > fittedMax
          ? fitMaxForValue(value, fittedMax, absoluteMax)
          : fittedMax,
      ),
    );
    // Only reset on scaleKey — fittedMax updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleKey]);

  // Adopt fitted max from comps. Shrink back when the user hasn't expanded yet
  // (e.g. fallback 400 → indie comps resolve to 15).
  useEffect(() => {
    initialMaxRef.current = fittedMax;
    if (!userExpandedRef.current) {
      setMax(
        withinAbsolute(
          value != null && value > fittedMax
            ? fitMaxForValue(value, fittedMax, absoluteMax)
            : fittedMax,
        ),
      );
      return;
    }
    setMax((m) => withinAbsolute(Math.max(m, fittedMax)));
    // value intentionally omitted — high controlled values are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fittedMax, absoluteMax]);

  // Expand when a controlled value lands above the current max (input / seed / tick).
  useEffect(() => {
    if (value == null) return;
    const capped = Math.min(value, absoluteMax);
    if (capped > maxRef.current) {
      userExpandedRef.current = true;
      setMax(fitMaxForValue(capped, maxRef.current, absoluteMax));
    }
    if (value > absoluteMax) {
      onChange(absoluteMax);
    }
  }, [value, absoluteMax, onChange]);

  const displayValue = value ?? MIN;
  const sliderValue = Math.min(expandVisual ?? displayValue, max);

  const numberStr = inputText || (value != null ? value.toFixed(1) : "");
  const sizerStr = numberStr || MIN.toFixed(1);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const updateWidth = () => {
      setInputWidth(el.getBoundingClientRect().width);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sizerStr]);

  const sampleVelocity = (raw: number) => {
    const now = performance.now();
    const { lastValue, lastTime, speed } = velocityRef.current;
    const dt = now - lastTime;

    if (lastTime > 0 && dt > 0 && dt < 80) {
      const instant = (Math.abs(raw - lastValue) / dt) * 1000;
      velocityRef.current.speed = speed * 0.35 + instant * 0.65;
    } else if (dt >= 80) {
      // Pause between moves — decay so a slow nudge after a fling counts as slow.
      velocityRef.current.speed *= 0.2;
    }

    velocityRef.current.lastValue = raw;
    velocityRef.current.lastTime = now;
    return velocityRef.current.speed;
  };

  const resetVelocity = () => {
    velocityRef.current = { lastValue: 0, lastTime: 0, speed: 0 };
  };

  const expandToFit = (target: number) => {
    const capped = Math.min(target, absoluteMax);
    const nextMax = fitMaxForValue(capped, maxRef.current, absoluteMax);
    if (nextMax > maxRef.current) {
      userExpandedRef.current = true;
      setMax(nextMax);
    }
    return nextMax;
  };

  const handleSliderChange = (values: number[]) => {
    // Freeze Radix remaps while the expand settle animation runs.
    if (expandLockRef.current) return;

    const raw = values[0];
    const speed = sampleVelocity(raw);
    const currentMax = maxRef.current;

    // In-range motion only — edge expansion is handled by the throttled overshoot path.
    let next = roundToTenth(raw);

    if (speed <= SLOW_SLIDE_SPEED) {
      next = snapToWholeMagnet(raw);
    }

    const clamped = Math.max(MIN, Math.min(currentMax, next));

    if (
      speed <= SLOW_SLIDE_SPEED &&
      Number.isInteger(clamped) &&
      clamped !== lastWholeRef.current
    ) {
      lastWholeRef.current = clamped;
      navigator.vibrate?.(8);
    } else if (!Number.isInteger(clamped)) {
      lastWholeRef.current = null;
    }

    onChange(clamped);
  };

  const handleSliderCommit = (values: number[]) => {
    cancelExpandAnim();
    setIsDragging(false);
    lastWholeRef.current = null;
    lastOvershootTickRef.current = 0;

    const raw = values[0];
    const speed = velocityRef.current.speed;
    resetVelocity();

    let next: number;
    if (speed >= FAST_SLIDE_SPEED) {
      next = Math.round(raw);
    } else if (speed <= SLOW_SLIDE_SPEED) {
      next = snapToDetent(snapToWholeMagnet(raw));
    } else {
      next = roundToTenth(raw);
    }

    const currentMax = maxRef.current;
    onChange(Math.max(MIN, Math.min(currentMax, absoluteMax, next)));
    navigator.vibrate?.(5);
  };

  // Gentle, throttled expand when the pointer is held past the right edge.
  useEffect(() => {
    if (!isDragging || disabled) return;

    const onMove = (e: PointerEvent) => {
      if (expandLockRef.current) return;

      const root = rootRef.current;
      if (!root) return;

      const currentMax = maxRef.current;
      const currentValue = valueRef.current ?? MIN;
      if (currentValue < currentMax * EDGE_EXPAND_RATIO) return;
      if (currentValue >= absoluteMax && currentMax >= absoluteMax) return;

      const rect = root.getBoundingClientRect();
      const pad = 10;
      const usableRight = rect.right - pad;
      if (e.clientX <= usableRight) return;

      const now = performance.now();
      if (now - lastOvershootTickRef.current < OVERSHOOT_TICK_MS) return;
      lastOvershootTickRef.current = now;

      const overshoot = e.clientX - usableRight;
      const delta = Math.min(
        OVERSHOOT_MAX_DELTA,
        Math.max(0.5, overshoot / OVERSHOOT_PX_PER_MILLION),
      );
      const next = roundToTenth(
        Math.min(absoluteMax, currentValue + delta),
      );
      const nextMax = growMaxForOvershoot(currentMax, next, absoluteMax);

      if (nextMax > currentMax) {
        userExpandedRef.current = true;
        setMax(nextMax);
        maxRef.current = nextMax;
        onChange(next);
        animateThumbAfterExpand(currentMax, nextMax, currentValue, next);
      } else {
        onChange(next);
      }
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [isDragging, disabled, absoluteMax, onChange]);

  const applyManualValue = (parsed: number) => {
    const next = snapToDetent(
      roundToTenth(Math.max(MIN, Math.min(absoluteMax, parsed))),
    );
    expandToFit(next);
    onChange(next);
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(inputText);
    if (!isNaN(parsed) && parsed >= MIN) {
      applyManualValue(parsed);
    }
    setInputText("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.currentTarget.blur();
  };

  const valueTextClass = isTicket
    ? isDragging
      ? "text-ticket-ink"
      : "text-ticket-ink/90"
    : isDragging
      ? "text-theater-gold drop-shadow-[0_0_8px_rgba(230,197,103,0.6)]"
      : "text-theater-gold/90";

  return (
    <div className={`space-y-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <label
          htmlFor={id}
          className={`text-sm font-medium flex items-center gap-1.5 ${
            isTicket ? "text-ticket-ink font-[Outfit,sans-serif]" : "text-stone-300"
          }`}
        >
          {disabled && <Lock size={12} />}
          {label}
        </label>
        <div
          className={`relative inline-flex items-center px-2 py-1 text-lg font-bold tabular-nums transition-all duration-150 ${
            disabled ? "cursor-not-allowed" : "cursor-text"
          } ${valueTextClass} ${
            isTicket
              ? "border border-ticket-ink/40 bg-ticket/40 focus-within:border-ticket-ink focus-within:ring-2 focus-within:ring-ticket-ink/30"
              : "rounded-lg border border-cinema-700 bg-cinema-900 focus-within:border-theater-gold/50 focus-within:ring-2 focus-within:ring-theater-gold/50"
          }`}
          onMouseDown={(e) => {
            if (disabled || e.target === inputRef.current) return;
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <span className="font-ticketing pointer-events-none absolute left-2 top-1/2 -translate-y-1/2" aria-hidden>
            $
          </span>
          <span className="font-ticketing invisible select-none" aria-hidden>
            $
          </span>
          <span
            ref={measureRef}
            className="font-ticketing invisible absolute whitespace-pre text-lg font-bold tabular-nums"
            aria-hidden
          >
            {sizerStr}
          </span>
          <input
            ref={inputRef}
            id={id}
            type="number"
            min={MIN}
            max={absoluteMax}
            step={0.1}
            disabled={disabled}
            placeholder={MIN.toFixed(1)}
            value={numberStr}
            onChange={(e) => setInputText(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setInputText(value != null ? value.toFixed(1) : "")}
            style={inputWidth != null ? { width: inputWidth } : undefined}
            className="font-ticketing bg-transparent border-0 p-0 text-left text-lg font-bold tabular-nums text-inherit focus:outline-none disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label={`${label} in millions`}
          />
          <span className="font-ticketing invisible select-none" aria-hidden>
            M
          </span>
          <span className="font-ticketing pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" aria-hidden>
            M
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Slider.Root
            ref={rootRef}
            className="relative flex items-center select-none touch-none h-5 min-w-0 flex-1"
            value={[sliderValue]}
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
            onPointerDown={() => {
              setIsDragging(true);
              resetVelocity();
              lastOvershootTickRef.current = 0;
            }}
            min={MIN}
            max={max}
            step={0.1}
            disabled={disabled}
            aria-valuetext={formatMillions(value)}
          >
            <Slider.Track
              className={`relative grow rounded-full h-2 ${
                isTicket ? "bg-ticket-ink/20" : "bg-cinema-800"
              }`}
            >
              <Slider.Range
                className={`absolute rounded-full h-full ${
                  isTicket ? "bg-ticket-ink/70" : "bg-theater-gold/60"
                }`}
              />
            </Slider.Track>
            <Slider.Thumb
              className={
                isTicket
                  ? "block w-5 h-5 bg-ticket-ink rounded-full hover:bg-black focus:outline-none focus:ring-2 focus:ring-ticket-ink/40 will-change-transform"
                  : "block w-5 h-5 bg-theater-gold rounded-full shadow-[0_0_12px_rgba(230,197,103,0.5)] hover:bg-[#f0d080] focus:outline-none focus:ring-2 focus:ring-theater-gold/50 will-change-transform"
              }
              aria-label={label}
            />
          </Slider.Root>
          <span
            className={`shrink-0 tabular-nums text-xs font-medium ${
              isTicket
                ? "text-ticket-ink/55 font-[Outfit,sans-serif]"
                : "text-stone-500"
            }`}
            title="Current scale maximum"
            aria-label={`Scale maximum ${formatMillions(max)}`}
          >
            {formatMillions(max)}
          </span>
        </div>

        {/* Radix keeps the thumb in-bounds, so 0–100% is inset by half of w-5. */}
        <div className="mx-2.5">
          <CompMarkers
            markers={compMarkers}
            getPos={(v) => valueToPosition(v, MIN, max)}
            formatValue={formatMillions}
            onSelect={(v) => {
              if (disabled) return;
              const next = Math.min(absoluteMax, snapToDetent(v));
              expandToFit(next);
              onChange(next);
            }}
            disabled={disabled}
            variant={variant}
          />
        </div>
      </div>
    </div>
  );
}
