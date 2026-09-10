import { useState } from "react";
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
}: LogMoneySliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputText, setInputText] = useState("");

  const displayValue = value ?? min;
  const position = valueToPosition(displayValue, min, max);

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

  return (
    <div className={`space-y-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-stone-300 flex items-center gap-1.5">
          {disabled && <Lock size={12} />}
          {label}
        </label>
        <span
          className={`text-lg font-bold tabular-nums transition-all duration-150 ${
            isDragging
              ? "text-theater-gold drop-shadow-[0_0_8px_rgba(230,197,103,0.6)]"
              : "text-theater-gold/90"
          }`}
        >
          {formatMillions(value)}
        </span>
      </div>

      <Slider.Root
        id={id}
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
        <Slider.Track className="bg-cinema-800 relative grow rounded-full h-2">
          <Slider.Range className="absolute bg-theater-gold/60 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb
          className="block w-5 h-5 bg-theater-gold rounded-full shadow-[0_0_12px_rgba(230,197,103,0.5)] hover:bg-[#f0d080] focus:outline-none focus:ring-2 focus:ring-theater-gold/50"
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
                <span className="w-0.5 h-2 bg-stone-500 group-hover:bg-theater-gold transition-colors" />
                <span className="text-[9px] text-stone-500 group-hover:text-theater-gold truncate max-w-[60px] transition-colors">
                  {comp.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <input
        type="number"
        min={min}
        max={max}
        step={0.1}
        disabled={disabled}
        placeholder={String(min)}
        value={inputText || (value != null ? String(value) : "")}
        onChange={(e) => setInputText(e.target.value)}
        onBlur={handleInputBlur}
        onFocus={() => setInputText(value != null ? String(value) : "")}
        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 focus:border-theater-gold/50 focus:outline-none disabled:cursor-not-allowed"
        aria-label={`${label} numeric input`}
      />
    </div>
  );
}
