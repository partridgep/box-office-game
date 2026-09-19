import { useLayoutEffect, useRef, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Lock } from "lucide-react";
import CompMarkers, { type CompMarker } from "./CompMarkers";

const MIN = 0;
const MAX = 100;

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

  const numberStr = inputText || (value != null ? String(value) : "");
  const sizerStr = numberStr || String(MIN);

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
        aria-valuetext={`${displayValue} percent`}
      >
        <Slider.Track
          className={`relative grow rounded-full h-2 ${
            isTicket ? "bg-ticket-ink/20" : "bg-cinema-800"
          }`}
        >
          <Slider.Range
            className={`absolute rounded-full h-full ${
              isTicket ? "bg-ticket-ink/70" : "bg-cinema-500"
            }`}
          />
        </Slider.Track>
        <Slider.Thumb
          className={
            isTicket
              ? "block w-5 h-5 bg-ticket-ink rounded-full hover:bg-black focus:outline-none focus:ring-2 focus:ring-ticket-ink/40"
              : "block w-5 h-5 bg-theater-gold rounded-full shadow-[0_0_12px_rgba(230,197,103,0.5)] hover:bg-[#f0d080] focus:outline-none focus:ring-2 focus:ring-theater-gold/50"
          }
          aria-label="Rotten Tomatoes score"
        />
      </Slider.Root>

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
