import { useLayoutEffect, useRef, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Lock } from "lucide-react";
import {
  valueToPosition,
  positionToValue,
  snapToDetent,
} from "../../utils/logScale";
import { formatMillions } from "../../utils/formatMoney";

export interface CompMarker {
  label: string;
  value: number;
}

interface LogMoneySliderProps {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  compMarkers?: CompMarker[];
  id?: string;
  variant?: "default" | "ticket";
}

export default function LogMoneySlider({
  label,
  value,
  onChange,
  min = 1,
  max = 300,
  disabled = false,
  compMarkers = [],
  id,
  variant = "default",
}: LogMoneySliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputWidth, setInputWidth] = useState<number | undefined>();
  const measureRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isTicket = variant === "ticket";

  const displayValue = value ?? min;
  const position = valueToPosition(displayValue, min, max);

  const numberStr = inputText || (value != null ? value.toFixed(1) : "");
  const sizerStr = numberStr || min.toFixed(1);

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

  const handleSliderChange = (positions: number[]) => {
    const raw = positionToValue(positions[0], min, max);
    onChange(Math.round(raw * 10) / 10);
  };

  const handleSliderCommit = (positions: number[]) => {
    setIsDragging(false);
    const raw = positionToValue(positions[0], min, max);
    const snapped = snapToDetent(Math.round(raw * 10) / 10);
    onChange(snapped);
    navigator.vibrate?.(5);
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(inputText);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(snapToDetent(parsed));
    }
    setInputText("");
  };

  const handleCompClick = (compValue: number) => {
    if (disabled) return;
    onChange(snapToDetent(compValue));
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
            min={min}
            max={max}
            step={0.1}
            disabled={disabled}
            placeholder={min.toFixed(1)}
            value={numberStr}
            onChange={(e) => setInputText(e.target.value)}
            onBlur={handleInputBlur}
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

      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[position]}
        onValueChange={handleSliderChange}
        onValueCommit={handleSliderCommit}
        onPointerDown={() => setIsDragging(true)}
        min={0}
        max={100}
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
              ? "block w-5 h-5 bg-ticket-ink rounded-full hover:bg-black focus:outline-none focus:ring-2 focus:ring-ticket-ink/40"
              : "block w-5 h-5 bg-theater-gold rounded-full shadow-[0_0_12px_rgba(230,197,103,0.5)] hover:bg-[#f0d080] focus:outline-none focus:ring-2 focus:ring-theater-gold/50"
          }
          aria-label={label}
        />
      </Slider.Root>

      {compMarkers.length > 0 && (
        <div className="relative h-6 mt-1">
          {compMarkers.map((comp) => {
            const compPos = valueToPosition(comp.value, min, max);
            return (
              <button
                key={comp.label}
                type="button"
                disabled={disabled}
                onClick={() => handleCompClick(comp.value)}
                className="absolute -translate-x-1/2 flex flex-col items-center group"
                style={{ left: `${compPos}%` }}
                title={`${comp.label}: ${formatMillions(comp.value)}`}
              >
                <span
                  className={`w-0.5 h-2 transition-colors ${
                    isTicket
                      ? "bg-ticket-ink/40 group-hover:bg-ticket-ink"
                      : "bg-stone-500 group-hover:bg-theater-gold"
                  }`}
                />
                <span
                  className={`text-[9px] truncate max-w-[60px] transition-colors ${
                    isTicket
                      ? "text-ticket-ink/50 group-hover:text-ticket-ink"
                      : "text-stone-500 group-hover:text-theater-gold"
                  }`}
                >
                  {comp.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
