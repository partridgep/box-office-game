import { useLayoutEffect, useRef, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Lock } from "lucide-react";
import CompMarkers, { type CompMarker } from "./CompMarkers";
import { FreshTomatoIcon, RottenSplatIcon } from "./RtScoreIcons";

const MIN = 0;
const MAX = 100;
const FRESH_THRESHOLD = 60;

/** Fixed spectrum: Rotten green → Fresh red, soft blend around 60%. */
const TRACK_GRADIENT =
  "linear-gradient(to right, #56a35a 0%, #43a047 35%, #8bc34a 50%, #ef6c00 58%, #e53935 68%, #c62828 100%)";

interface RTScoreSliderProps {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
  variant?: "default" | "ticket";
  compMarkers?: CompMarker[];
  id?: string;
}

export default function RTScoreSlider({
  value,
  onChange,
  disabled = false,
  variant = "default",
  compMarkers = [],
  id,
}: RTScoreSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputWidth, setInputWidth] = useState<number | undefined>();
  const measureRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = value ?? MIN;
  const isTicket = variant === "ticket";
  const category =
    value == null ? null : value >= FRESH_THRESHOLD ? "fresh" : "rotten";
  const thumbIsFresh = displayValue >= FRESH_THRESHOLD;

  const numberStr = inputText || (value != null ? String(value) : "");
  // Reserve 3-digit width so 9 → 10 → 100 doesn't shift Fresh/Rotten.
  const sizerStr =
    (numberStr || String(MIN)).length >= 3 ? numberStr || String(MIN) : "100";

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

  const applyManualValue = (parsed: number) => {
    const next = Math.round(Math.max(MIN, Math.min(MAX, parsed)));
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

  const ariaValueText =
    category == null
      ? `${displayValue} percent`
      : `${displayValue} percent, ${category === "fresh" ? "Fresh" : "Rotten"}`;

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
          Rotten Tomatoes Score
        </label>
        <div className="flex items-center gap-2.5">
          {value != null && (
            <div
              className={`relative h-5 w-[5.5rem] ${
                isTicket
                  ? "font-[Outfit,sans-serif] text-ticket-ink/80"
                  : "text-stone-300"
              }`}
              aria-hidden
            >
              <div
                className={`absolute inset-0 flex items-center gap-1.5 transition-[translate,opacity] duration-200 ease-out ${
                  category === "fresh"
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-6 opacity-0"
                }`}
              >
                <FreshTomatoIcon className="shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c62828]">
                  Fresh
                </span>
              </div>
              <div
                className={`absolute inset-0 flex items-center gap-1.5 transition-[translate,opacity] duration-200 ease-out ${
                  category === "rotten"
                    ? "translate-y-0 opacity-100"
                    : "translate-y-6 opacity-0"
                }`}
              >
                <RottenSplatIcon className="shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e7d32]">
                  Rotten
                </span>
              </div>
            </div>
          )}
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
              max={MAX}
              step={1}
              disabled={disabled}
              placeholder={String(MIN)}
              value={numberStr}
              onChange={(e) => setInputText(e.target.value)}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setInputText(value != null ? String(value) : "")}
              style={inputWidth != null ? { width: inputWidth } : undefined}
              className="font-ticketing bg-transparent border-0 p-0 text-left text-lg font-bold tabular-nums text-inherit focus:outline-none disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label="Rotten Tomatoes score"
            />
            <span className="font-ticketing invisible select-none" aria-hidden>
              %
            </span>
            <span
              className="font-ticketing pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
              aria-hidden
            >
              %
            </span>
          </div>
        </div>
      </div>

      <div className="relative">
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          value={[displayValue]}
          onValueChange={([v]) => onChange(v)}
          onValueCommit={() => {
            setIsDragging(false);
            navigator.vibrate?.(5);
          }}
          onPointerDown={() => setIsDragging(true)}
          min={MIN}
          max={MAX}
          step={1}
          disabled={disabled}
          aria-valuetext={ariaValueText}
        >
          <Slider.Track
            className="relative grow rounded-full h-2 overflow-hidden"
            style={{ background: TRACK_GRADIENT }}
          >
            <Slider.Range className="absolute rounded-full h-full bg-transparent" />
          </Slider.Track>
          <Slider.Thumb
            className={`block w-5 h-5 rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              thumbIsFresh
                ? "bg-[#b71c1c] hover:bg-[#c62828] focus:ring-[#b71c1c]/50"
                : "bg-[#1b5e20] hover:bg-[#2e7d32] focus:ring-[#1b5e20]/50"
            }`}
            aria-label="Rotten Tomatoes score"
          />
        </Slider.Root>
      </div>

      {/* Radix keeps the thumb in-bounds, so 0–100% is inset by half of w-5. */}
      <div className="mx-2.5">
        <CompMarkers
          markers={compMarkers}
          getPos={(v) => Math.min(100, Math.max(0, v))}
          formatValue={(v) => `${Math.round(v)}%`}
          onSelect={(v) => {
            if (disabled) return;
            onChange(Math.round(v));
          }}
          disabled={disabled}
          variant={variant}
        />
      </div>
    </div>
  );
}
