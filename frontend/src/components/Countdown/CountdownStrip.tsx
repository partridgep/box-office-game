import { useMemo } from "react";
import { Lock, Clock } from "lucide-react";
import { MovieData } from "../../types";
import { getPredictionWindows } from "../../utils/predictionWindows";
import { useCountdown, formatCountdown } from "../../hooks/useCountdown";

interface DeadlineInfo {
  label: string;
  deadline: Date;
  isOpen: boolean;
}

interface CountdownStripProps {
  movie: MovieData;
  availability: ReturnType<
    typeof import("../../utils/predictionWindows").getPredictionAvailability
  >;
  className?: string;
}

function DeadlineRow({
  label,
  deadline,
  isOpen,
  isPrimary,
}: {
  label: string;
  deadline: Date;
  isOpen: boolean;
  isPrimary: boolean;
}) {
  const countdown = useCountdown(deadline);

  if (!isOpen) {
    return (
      <div className="flex items-center gap-2 text-stone-400 text-sm">
        <Lock size={14} className="shrink-0" />
        <span>
          {label} closed{" "}
          <span className="text-stone-500">
            ({deadline.toLocaleDateString(undefined, { month: "short", day: "numeric" })})
          </span>
        </span>
      </div>
    );
  }

  const urgentClass =
    countdown.isUrgent && isPrimary
      ? "text-theater-gold motion-safe:animate-pulse"
      : isPrimary
        ? "text-theater-gold"
        : "text-stone-300";

  return (
    <div className={`flex items-center gap-2 text-sm ${urgentClass}`}>
      <Clock size={14} className="shrink-0" />
      <span>
        <strong className="font-semibold">{formatCountdown(countdown)}</strong>
        {" until "}
        {label}
      </span>
    </div>
  );
}

export default function CountdownStrip({ movie, availability, className = "" }: CountdownStripProps) {
  const { boxOfficeCutoff, rottenTomatoesCutoff } = getPredictionWindows(movie);

  const deadlines = useMemo((): DeadlineInfo[] => {
    const items: DeadlineInfo[] = [
      {
        label: "Rotten Tomatoes predictions",
        deadline: rottenTomatoesCutoff,
        isOpen: availability.rottenTomatoes,
      },
      {
        label: "Box office predictions",
        deadline: boxOfficeCutoff,
        isOpen: availability.domesticOpening,
      },
    ];
    return items.sort((a, b) => {
      if (a.isOpen && !b.isOpen) return -1;
      if (!a.isOpen && b.isOpen) return 1;
      if (a.isOpen && b.isOpen) return a.deadline.getTime() - b.deadline.getTime();
      return 0;
    });
  }, [availability, boxOfficeCutoff, rottenTomatoesCutoff]);

  const anyOpen = availability.anyOpen;

  return (
    <div
      className={`rounded-xl border p-4 ${
        anyOpen
          ? "bg-cinema-900/55 border-theater-gold/30 backdrop-blur-md"
          : "bg-cinema-900/45 border-cinema-800 backdrop-blur-md"
      } ${className}`}
    >
      <div className="space-y-2">
        {deadlines.map((d, i) => (
          <DeadlineRow
            key={d.label}
            label={d.label}
            deadline={d.deadline}
            isOpen={d.isOpen}
            isPrimary={i === 0 && d.isOpen}
          />
        ))}
      </div>
      {!anyOpen && (
        <p className="mt-2 text-xs text-stone-500">
          All prediction windows have closed for this title.
        </p>
      )}
    </div>
  );
}
