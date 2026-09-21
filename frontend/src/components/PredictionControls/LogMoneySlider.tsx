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
  EDGE_AT_MAX_EPSILON,
  initialMoneyMax,
  fitMaxForValue,
  OVERSHOOT_PX_PER_MILLION,
  OVERSHOOT_MAX_DELTA,
  OVERSHOOT_HOLD_MS,
  EXPAND_ANIM_MS,
  EXPAND_RETURN_MS,
  EXPAND_HANDOFF_MS,
  growMaxForOvershoot,
} from "../../utils/logScale";
import { formatMillions } from "../../utils/formatMoney";
import CompMarkers, { type CompMarker } from "./CompMarkers";

export type { CompMarker };

interface LogMoneySliderProps {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  /** Fires when the user finishes a gesture (pointer up, input blur, comp tap). */
  onCommit?: (v: number) => void;
  /** Used when comps are empty (and as a floor for the initial fit). */
  fallbackMax: number;
  /** Hard floor for the selectable value (track still scales from 0). */
  absoluteMin?: number;
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
  onCommit,
  fallbackMax,
  absoluteMin = 0,
  absoluteMax,
  scaleKey,
  disabled = false,
  compMarkers = [],
  id,
  variant = "default",
}: LogMoneySliderProps) {
  /** Visual / track scale always starts at 0 so comps below the floor stay visible. */
  const scaleMin = 0;
  // Round so a floaty absoluteMin (e.g. opening) doesn't poison step grids / commits.
  const floor = roundToTenth(
    Math.max(scaleMin, Math.min(absoluteMin, absoluteMax)),
  );
  const floorRef = useRef(floor);
  floorRef.current = floor;

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
    () =>
      Math.max(
        // Scale must be able to contain the selectable floor.
        floor,
        initialMoneyMax(compMarkers, fallbackMax, absoluteMax),
      ),
    // markerSignature captures comps; fallbackMax / absoluteMax / floor are explicit
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markerSignature, fallbackMax, absoluteMax, floor],
  );

  /** Clamp a scale max into [floor, absoluteMax] so the thumb can sit on the floor. */
  const withinAbsolute = (m: number) =>
    Math.max(floor, Math.min(m, absoluteMax));

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

  const clampValue = (v: number, currentMax = maxRef.current) =>
    Math.max(floor, Math.min(currentMax, absoluteMax, v));

  const userExpandedRef = useRef(false);
  /** When the pointer first pressed past the edge (resistance hold clock). */
  const edgeHoldStartedAtRef = useRef<number | null>(null);
  const expandLockRef = useRef(false);
  const expandAnimRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  /** True while the pointer is past the track. */
  const pointerPastEdgeRef = useRef(false);
  /** Once past the edge this drag, stay in overshoot until handoff ease. */
  const overshootModeRef = useRef(false);
  const lastPointerXRef = useRef<number | null>(null);
  const expandVisualRef = useRef<number | null>(null);

  /** While set, drives the thumb so it can ease after a max expand / handoff. */
  const [expandVisual, setExpandVisual] = useState<number | null>(null);
  expandVisualRef.current = expandVisual;

  const [isDragging, setIsDragging] = useState(false);
  isDraggingRef.current = isDragging;
  /** True while holding past the edge against the max (resistance / about to expand). */
  const [isEdgeHolding, setIsEdgeHolding] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputWidth, setInputWidth] = useState<number | undefined>();
  const measureRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastWholeRef = useRef<number | null>(null);
  const velocityRef = useRef({ lastValue: 0, lastTime: 0, speed: 0 });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const isTicket = variant === "ticket";

  const emitCommit = (v: number) => {
    onCommitRef.current?.(v);
  };

  const cancelExpandAnim = () => {
    if (expandAnimRef.current != null) {
      cancelAnimationFrame(expandAnimRef.current);
      expandAnimRef.current = null;
    }
    expandLockRef.current = false;
    expandVisualRef.current = null;
    setExpandVisual(null);
  };

  const runVisualPhase = (
    from: number,
    to: number,
    duration: number,
    syncValue: boolean,
    onDone: () => void,
  ) => {
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - t) ** 2;
      const v = from + (to - from) * eased;
      expandVisualRef.current = v;
      setExpandVisual(v);
      if (syncValue) {
        onChangeRef.current(
          roundToTenth(Math.max(floorRef.current, v)),
        );
      }
      if (t < 1) {
        expandAnimRef.current = requestAnimationFrame(tick);
      } else {
        onDone();
      }
    };
    expandAnimRef.current = requestAnimationFrame(tick);
  };

  const valueFromPointerX = (clientX: number): number => {
    const root = rootRef.current;
    const currentMax = maxRef.current;
    if (!root || currentMax <= scaleMin) {
      return valueRef.current ?? floorRef.current;
    }
    const rect = root.getBoundingClientRect();
    const pad = 10;
    const usable = Math.max(1, rect.width - pad * 2);
    const x = Math.min(Math.max(clientX - (rect.left + pad), 0), usable);
    return roundToTenth(scaleMin + (x / usable) * (currentMax - scaleMin));
  };

  /**
   * Ease from overshoot/visual control back into normal Radix behavior.
   */
  const beginHandoff = () => {
    if (expandAnimRef.current != null) {
      cancelAnimationFrame(expandAnimRef.current);
      expandAnimRef.current = null;
    }

    const from = expandVisualRef.current ?? valueRef.current ?? floorRef.current;
    const to =
      lastPointerXRef.current != null
        ? valueFromPointerX(lastPointerXRef.current)
        : from;
    const clampedTo = clampValue(to);

    overshootModeRef.current = false;
    pointerPastEdgeRef.current = false;
    edgeHoldStartedAtRef.current = null;
    setIsEdgeHolding(false);
    expandLockRef.current = true;
    expandVisualRef.current = from;
    setExpandVisual(from);

    if (Math.abs(clampedTo - from) < 0.15) {
      onChangeRef.current(clampedTo);
      expandLockRef.current = false;
      expandVisualRef.current = null;
      setExpandVisual(null);
      return;
    }

    runVisualPhase(from, clampedTo, EXPAND_HANDOFF_MS, true, () => {
      onChangeRef.current(clampedTo);
      expandAnimRef.current = null;
      expandLockRef.current = false;
      expandVisualRef.current = null;
      setExpandVisual(null);
    });
  };

  /**
   * After max grows: ease left to show the new range, then (if still held past
   * the edge) ease back toward the right so the thumb doesn't snap.
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
    const midVisual = Math.min(newMax, toValue);
    // Ease back to the true end — next expand requires another hold against it.
    const rightVisual = newMax;

    expandLockRef.current = true;
    expandVisualRef.current = startVisual;
    setExpandVisual(startVisual);

    runVisualPhase(startVisual, midVisual, EXPAND_ANIM_MS, false, () => {
      const stillHeldPastEdge =
        isDraggingRef.current && pointerPastEdgeRef.current;

      if (!stillHeldPastEdge || rightVisual - midVisual < 0.5) {
        expandAnimRef.current = null;
        expandLockRef.current = false;
        // Still in overshoot mode but back inside? handoff; else clear visual.
        if (isDraggingRef.current && overshootModeRef.current && !pointerPastEdgeRef.current) {
          beginHandoff();
        } else {
          expandVisualRef.current = null;
          setExpandVisual(null);
          // Restart resistance if still pressed past the edge on the new scale.
          if (stillHeldPastEdge) {
            edgeHoldStartedAtRef.current = performance.now();
          }
        }
        return;
      }

      // Ease back toward the right edge while the user keeps holding.
      runVisualPhase(midVisual, rightVisual, EXPAND_RETURN_MS, true, () => {
        onChangeRef.current(rightVisual);
        expandAnimRef.current = null;
        expandLockRef.current = false;
        expandVisualRef.current = null;
        setExpandVisual(null);
        // Resistance resets against the new max — hold again to break through.
        edgeHoldStartedAtRef.current = performance.now();

        if (
          isDraggingRef.current &&
          overshootModeRef.current &&
          !pointerPastEdgeRef.current
        ) {
          beginHandoff();
        }
      });
    });
  };

  const applyOvershootTick = (overshootPx: number) => {
    if (expandLockRef.current) return;

    const currentMax = maxRef.current;
    const currentValue = valueRef.current ?? floorRef.current;

    // Scale is at the hard ceiling — snap value to it and leave overshoot mode
    // so normal slider dragging can sit on the absolute max.
    if (currentMax >= absoluteMax) {
      if (currentValue < absoluteMax) {
        onChangeRef.current(absoluteMax);
      }
      overshootModeRef.current = false;
      pointerPastEdgeRef.current = false;
      edgeHoldStartedAtRef.current = null;
      setIsEdgeHolding(false);
      return;
    }

    if (currentValue >= absoluteMax) return;

    // Must be against the true end of the current scale (not a % threshold).
    if (currentValue < currentMax - EDGE_AT_MAX_EPSILON) return;

    const holdStarted = edgeHoldStartedAtRef.current;
    if (holdStarted == null) return;

    const now = performance.now();
    // Resistance: hold past the edge before the scale yields.
    if (now - holdStarted < OVERSHOOT_HOLD_MS) return;

    const delta = Math.min(
      OVERSHOOT_MAX_DELTA,
      Math.max(0.5, overshootPx / OVERSHOOT_PX_PER_MILLION),
    );
    const next = roundToTenth(Math.min(absoluteMax, currentValue + delta));
    const nextMax = growMaxForOvershoot(currentMax, next, absoluteMax);

    if (nextMax > currentMax) {
      userExpandedRef.current = true;
      // Pause the hold clock until the expand animation settles.
      edgeHoldStartedAtRef.current = null;
      setMax(nextMax);
      maxRef.current = nextMax;
      onChangeRef.current(next);
      animateThumbAfterExpand(currentMax, nextMax, currentValue, next);
    } else {
      onChangeRef.current(next);
    }
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
  // Raise value / scale when the floor moves up (e.g. opening increased).
  useEffect(() => {
    if (maxRef.current < floor) {
      const nextMax = withinAbsolute(
        Math.max(floor, fitMaxForValue(floor, floor, absoluteMax)),
      );
      setMax(nextMax);
      maxRef.current = nextMax;
    }
    if (value != null && value < floor) {
      onChange(floor);
      return;
    }
    if (value == null) return;
    const capped = Math.min(value, absoluteMax);
    if (capped > maxRef.current) {
      userExpandedRef.current = true;
      setMax(fitMaxForValue(capped, maxRef.current, absoluteMax));
    }
    if (value > absoluteMax) {
      onChange(absoluteMax);
    }
  }, [value, absoluteMax, floor, onChange]);

  const displayValue = value ?? floor;
  const sliderValue = Math.min(
    Math.max(expandVisual ?? displayValue, scaleMin),
    max,
  );
  // Thumb/value never sit below the selectable floor, but the track still
  // spans scaleMin→max so comps in that region remain visible.
  const constrainedSliderValue = Math.max(sliderValue, floor);

  const numberStr = inputText || (value != null ? value.toFixed(1) : "");
  const sizerStr = numberStr || scaleMin.toFixed(1);

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
    // Freeze Radix while overshooting / animating / handing off.
    if (expandLockRef.current || overshootModeRef.current) return;

    const raw = values[0];
    const speed = sampleVelocity(raw);
    const currentMax = maxRef.current;

    // In-range motion only — edge expansion is handled by the throttled overshoot path.
    let next = roundToTenth(raw);

    if (speed <= SLOW_SLIDE_SPEED) {
      next = snapToWholeMagnet(raw);
    }

    const clamped = clampValue(next, currentMax);

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
    isDraggingRef.current = false;
    pointerPastEdgeRef.current = false;
    overshootModeRef.current = false;
    edgeHoldStartedAtRef.current = null;
    setIsEdgeHolding(false);
    lastPointerXRef.current = null;
    lastWholeRef.current = null;

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
    const committed = clampValue(next, currentMax);
    onChange(committed);
    emitCommit(committed);
    navigator.vibrate?.(5);
  };

  // Hold past the track edge against the true max; after resistance, expand.
  useEffect(() => {
    if (!isDragging || disabled) return;

    const trackPad = 10;

    const onMove = (e: PointerEvent) => {
      lastPointerXRef.current = e.clientX;
      const root = rootRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const usableRight = rect.right - trackPad;
      const pastEdge = e.clientX > usableRight;
      pointerPastEdgeRef.current = pastEdge;

      if (pastEdge) {
        // Can't grow further — stay on normal Radix so the thumb can reach the end.
        if (maxRef.current >= absoluteMax) {
          if (overshootModeRef.current && !expandLockRef.current) {
            beginHandoff();
          }
          edgeHoldStartedAtRef.current = null;
          setIsEdgeHolding(false);
          return;
        }

        const atMax =
          (valueRef.current ?? floorRef.current) >=
          maxRef.current - EDGE_AT_MAX_EPSILON;

        // Let Radix finish driving to the true end before resistance starts.
        if (!atMax) {
          edgeHoldStartedAtRef.current = null;
          setIsEdgeHolding(false);
          if (overshootModeRef.current && !expandLockRef.current) {
            beginHandoff();
          }
          return;
        }

        if (!overshootModeRef.current) {
          // Start the resistance clock the moment they push past the end.
          edgeHoldStartedAtRef.current = performance.now();
          setIsEdgeHolding(true);
        }
        overshootModeRef.current = true;
        return;
      }

      // Left the edge — clear resistance and ease into normal slider control.
      edgeHoldStartedAtRef.current = null;
      setIsEdgeHolding(false);
      if (overshootModeRef.current && !expandLockRef.current) {
        beginHandoff();
      }
    };

    const intervalId = window.setInterval(() => {
      if (!overshootModeRef.current || !pointerPastEdgeRef.current) return;
      if (expandLockRef.current) return;
      if (lastPointerXRef.current == null) return;

      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const usableRight = rect.right - trackPad;
      const overshootPx = Math.max(0, lastPointerXRef.current - usableRight);
      applyOvershootTick(overshootPx);
    }, 50);

    window.addEventListener("pointermove", onMove);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("pointermove", onMove);
    };
    // beginHandoff / applyOvershootTick close over stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, disabled, absoluteMax]);

  const applyManualValue = (parsed: number) => {
    const next = snapToDetent(roundToTenth(clampValue(parsed, absoluteMax)));
    const clamped = clampValue(next, absoluteMax);
    expandToFit(clamped);
    onChange(clamped);
    emitCommit(clamped);
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(inputText);
    if (!isNaN(parsed)) {
      applyManualValue(parsed);
    }
    setInputText("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.currentTarget.blur();
  };

  const atAbsoluteMax = max >= absoluteMax;

  const expandScaleManually = () => {
    if (disabled || maxRef.current >= absoluteMax) return;
    const currentMax = maxRef.current;
    const nextMax = growMaxForOvershoot(
      currentMax,
      valueRef.current ?? floor,
      absoluteMax,
    );
    if (nextMax <= currentMax) return;
    userExpandedRef.current = true;
    setMax(nextMax);
    maxRef.current = nextMax;
  };

  /** DEV-only: restore scale to the comps/fallback fit. */
  const resetScale = () => {
    cancelExpandAnim();
    userExpandedRef.current = false;
    overshootModeRef.current = false;
    pointerPastEdgeRef.current = false;
    edgeHoldStartedAtRef.current = null;
    setIsEdgeHolding(false);
    initialMaxRef.current = fittedMax;
    setMax(withinAbsolute(fittedMax));
    maxRef.current = withinAbsolute(fittedMax);
    if (value != null && value > fittedMax) {
      onChange(Math.max(floor, fittedMax));
    }
    if (value != null && value < floor) {
      onChange(floor);
    }
  };

  /** DEV-only: manually set the scale max. */
  const setScaleMaxManually = (raw: number) => {
    if (!Number.isFinite(raw)) return;
    cancelExpandAnim();
    const nextMax = Math.max(
      floor,
      Math.min(absoluteMax, roundToTenth(raw)),
    );
    userExpandedRef.current = true;
    overshootModeRef.current = false;
    pointerPastEdgeRef.current = false;
    edgeHoldStartedAtRef.current = null;
    setIsEdgeHolding(false);
    setMax(nextMax);
    maxRef.current = nextMax;
    if (value != null && value > nextMax) {
      onChange(nextMax);
    }
    if (value != null && value < floor) {
      onChange(floor);
    }
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
            min={floor}
            max={absoluteMax}
            // "any" avoids native step-mismatch when min is a dynamic floor
            // (value must be min + n*step). Clamping/snapping stay in JS.
            step="any"
            disabled={disabled}
            placeholder={scaleMin.toFixed(1)}
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
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Slider.Root
              ref={rootRef}
              className="relative flex items-center select-none touch-none h-5 w-full"
              value={[constrainedSliderValue]}
              onValueChange={handleSliderChange}
              onValueCommit={handleSliderCommit}
              onPointerDown={() => {
                setIsDragging(true);
                isDraggingRef.current = true;
                overshootModeRef.current = false;
                pointerPastEdgeRef.current = false;
                edgeHoldStartedAtRef.current = null;
                setIsEdgeHolding(false);
                lastPointerXRef.current = null;
                resetVelocity();
              }}
              min={scaleMin}
              max={max}
              step={0.1}
              disabled={disabled}
              aria-valuetext={formatMillions(value)}
              aria-valuemin={floor}
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

            {/* Radix keeps the thumb in-bounds, so 0–100% is inset by half of w-5. */}
            <div className="mx-2.5">
              <CompMarkers
                markers={compMarkers}
                getPos={(v) => valueToPosition(v, scaleMin, max)}
                formatValue={formatMillions}
                onSelect={(v) => {
                  if (disabled) return;
                  const next = clampValue(snapToDetent(v), absoluteMax);
                  expandToFit(next);
                  onChange(next);
                  emitCommit(next);
                }}
                disabled={disabled}
                variant={variant}
                positionTransitionMs={EXPAND_ANIM_MS}
              />
            </div>
          </div>

          <button
            type="button"
            disabled={disabled || atAbsoluteMax}
            onClick={expandScaleManually}
            className={`inline-flex h-5 w-19 shrink-0 items-center tabular-nums text-xs font-medium transition-colors ${
              isTicket
                ? "text-ticket-ink/55 font-[Outfit,sans-serif] enabled:hover:text-ticket-ink/80"
                : "text-stone-500 enabled:hover:text-stone-300"
            } disabled:cursor-default disabled:opacity-60`}
            title={
              atAbsoluteMax
                ? "Scale at absolute maximum"
                : isEdgeHolding
                  ? "Hold to increase scale maximum"
                  : "Increase scale maximum"
            }
            aria-label={
              atAbsoluteMax
                ? `Scale maximum ${formatMillions(max)}`
                : isEdgeHolding
                  ? `Holding to increase scale maximum from ${formatMillions(max)}`
                  : `Increase scale maximum from ${formatMillions(max)}`
            }
          >
            {formatMillions(max)}
            {!atAbsoluteMax && (
              <span className="inline-flex items-center">
                +
                <span
                  className={`inline-block overflow-hidden transition-[max-width,opacity] duration-200 ease-out ${
                    isEdgeHolding
                      ? "max-w-[0.75em] opacity-100"
                      : "max-w-0 opacity-0"
                  }`}
                  aria-hidden={!isEdgeHolding}
                >
                  ?
                </span>
                <span
                  className="ml-0.5 inline-block border-y-[3.5px] border-y-transparent border-l-[5px] border-l-current"
                  aria-hidden
                />
              </span>
            )}
          </button>
          {import.meta.env.DEV && import.meta.env.VITE_DEV_SETTINGS === "true" && (
            <>
              <label
                className={`flex h-5 shrink-0 items-center gap-1 text-[10px] uppercase tracking-wide ${
                  isTicket
                    ? "text-ticket-ink/45 font-[Outfit,sans-serif]"
                    : "text-stone-500"
                }`}
                title="Set scale max manually (dev only)"
              >
                Max
                <input
                  type="number"
                  min={1}
                  max={absoluteMax}
                  step={1}
                  value={Math.round(max)}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed)) setScaleMaxManually(parsed);
                  }}
                  className={`w-14 rounded border px-1 py-0.5 text-[11px] tabular-nums normal-case tracking-normal ${
                    isTicket
                      ? "border-ticket-ink/30 bg-ticket/40 text-ticket-ink"
                      : "border-cinema-700 bg-cinema-900 text-stone-300"
                  }`}
                />
              </label>
              <button
                type="button"
                onClick={resetScale}
                className={`h-5 shrink-0 text-[10px] uppercase tracking-wide underline-offset-2 hover:underline ${
                  isTicket
                    ? "text-ticket-ink/45 font-[Outfit,sans-serif]"
                    : "text-stone-500"
                }`}
                title="Reset slider scale to comps/fallback fit (dev only)"
              >
                Reset scale
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
