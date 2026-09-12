import { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Lock } from "lucide-react";

interface RTScoreSliderProps {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
  variant?: "default" | "ticket";
}

export default function RTScoreSlider({
  value,
  onChange,
  disabled = false,
  variant = "default",
}: RTScoreSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const displayValue = value ?? 50;
  const isTicket = variant === "ticket";

  return (
    <div className={`space-y-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <label
          className={`text-sm font-medium flex items-center gap-1.5 ${
            isTicket ? "text-ticket-ink font-[Outfit,sans-serif]" : "text-stone-300"
          }`}
        >
          {disabled && <Lock size={12} />}
          Rotten Tomatoes Score
        </label>
        <span
          className={`text-lg font-bold tabular-nums transition-all duration-150 ${
            isTicket
              ? "text-ticket-ink"
              : isDragging
                ? "text-theater-gold drop-shadow-[0_0_8px_rgba(230,197,103,0.6)]"
                : "text-theater-gold/90"
          }`}
        >
          {value != null ? `${value}%` : "—"}
        </span>
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
        min={0}
        max={100}
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

      <input
        type="number"
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
            onChange(parsed);
          }
        }}
        className={
          isTicket
            ? "w-full bg-ticket/40 border border-ticket-ink/40 px-3 py-1.5 text-sm text-ticket-ink font-ticketing focus:border-ticket-ink focus:outline-none focus:ring-2 focus:ring-ticket-ink/30 disabled:cursor-not-allowed"
            : "w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 focus:border-theater-gold/50 focus:outline-none disabled:cursor-not-allowed"
        }
        aria-label="Rotten Tomatoes score numeric input"
      />
    </div>
  );
}
