import { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Lock } from "lucide-react";

interface RTScoreSliderProps {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
}

export default function RTScoreSlider({
  value,
  onChange,
  disabled = false,
}: RTScoreSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const displayValue = value ?? 50;

  return (
    <div className={`space-y-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm font-medium text-stone-300 flex items-center gap-1.5">
          {disabled && <Lock size={12} />}
          Rotten Tomatoes Score
        </label>
        <span
          className={`text-lg font-bold tabular-nums transition-all duration-150 ${
            isDragging
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
        <Slider.Track className="bg-cinema-800 relative grow rounded-full h-2">
          <Slider.Range className="absolute bg-cinema-500 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb
          className="block w-5 h-5 bg-theater-gold rounded-full shadow-[0_0_12px_rgba(230,197,103,0.5)] hover:bg-[#f0d080] focus:outline-none focus:ring-2 focus:ring-theater-gold/50"
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
        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 focus:border-theater-gold/50 focus:outline-none disabled:cursor-not-allowed"
        aria-label="Rotten Tomatoes score numeric input"
      />
    </div>
  );
}
