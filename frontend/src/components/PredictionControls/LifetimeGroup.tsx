import LogMoneySlider from "./LogMoneySlider";
import type { CompMarker } from "./CompMarkers";
import { formatMillions } from "../../utils/formatMoney";

interface LifetimeGroupProps {
  finalDomestic: number | null;
  finalInternational: number | null;
  domesticOpening: number | null;
  internationalOpening: number | null;
  onFinalDomesticChange: (v: number) => void;
  onFinalInternationalChange: (v: number) => void;
  disabled: boolean;
  variant?: "default" | "ticket";
  finalDomesticMarkers?: CompMarker[];
  finalInternationalMarkers?: CompMarker[];
}

export default function LifetimeGroup({
  finalDomestic,
  finalInternational,
  domesticOpening,
  internationalOpening,
  onFinalDomesticChange,
  onFinalInternationalChange,
  disabled,
  variant = "default",
  finalDomesticMarkers = [],
  finalInternationalMarkers = [],
}: LifetimeGroupProps) {
  const isTicket = variant === "ticket";

  const worldwideFinal =
    finalDomestic != null && finalInternational != null
      ? finalDomestic + finalInternational
      : null;

  const showDomesticWarning =
    finalDomestic != null &&
    domesticOpening != null &&
    finalDomestic < domesticOpening;

  const showIntlWarning =
    finalInternational != null &&
    internationalOpening != null &&
    finalInternational < internationalOpening;

  return (
    <div>
      <h2
        className={
          isTicket
            ? "text-2xl font-bold uppercase tracking-wide mb-1"
            : "text-2xl font-bold font-ticketing text-stone-100 mb-1"
        }
      >
        Lifetime Gross
      </h2>
      <p
        className={
          isTicket
            ? "text-xs text-ticket-ink/65 mb-4 font-[Outfit,sans-serif]"
            : "text-xs text-stone-500 mb-4"
        }
      >
        Most films earn 2.5–3.5× their opening domestically.
      </p>

      <div className="space-y-5">
        <LogMoneySlider
          id="final_domestic"
          label="Final Domestic ($M)"
          value={finalDomestic}
          onChange={onFinalDomesticChange}
          min={1}
          max={500}
          disabled={disabled}
          variant={variant}
          compMarkers={finalDomesticMarkers}
        />
        {showDomesticWarning && (
          <p
            className={
              isTicket
                ? "text-xs text-ticket-ink/80 -mt-2 font-[Outfit,sans-serif]"
                : "text-xs text-amber-400/90 -mt-2"
            }
          >
            Final domestic is below your opening prediction — unusual but allowed.
          </p>
        )}

        <LogMoneySlider
          id="final_international"
          label="Final International ($M)"
          value={finalInternational}
          onChange={onFinalInternationalChange}
          min={1}
          max={500}
          disabled={disabled}
          variant={variant}
          compMarkers={finalInternationalMarkers}
        />
        {showIntlWarning && (
          <p
            className={
              isTicket
                ? "text-xs text-ticket-ink/80 -mt-2 font-[Outfit,sans-serif]"
                : "text-xs text-amber-400/90 -mt-2"
            }
          >
            Final international is below your opening prediction — unusual but allowed.
          </p>
        )}

        <div
          className={`flex items-center justify-between pt-2 border-t ${
            isTicket ? "border-ticket-ink/30" : "border-cinema-800"
          }`}
        >
          <span
            className={
              isTicket
                ? "text-sm uppercase tracking-wide text-ticket-ink/70"
                : "text-sm text-stone-400"
            }
          >
            Worldwide Final
          </span>
          <span
            className={
              isTicket
                ? "text-base font-bold tabular-nums"
                : "text-base font-bold text-theater-gold"
            }
          >
            {formatMillions(worldwideFinal)}
          </span>
        </div>
      </div>
    </div>
  );
}
