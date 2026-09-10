import LogMoneySlider from "./LogMoneySlider";
import { formatMillions } from "../../utils/formatMoney";

interface LifetimeGroupProps {
  finalDomestic: number | null;
  finalInternational: number | null;
  domesticOpening: number | null;
  internationalOpening: number | null;
  onFinalDomesticChange: (v: number) => void;
  onFinalInternationalChange: (v: number) => void;
  disabled: boolean;
}

export default function LifetimeGroup({
  finalDomestic,
  finalInternational,
  domesticOpening,
  internationalOpening,
  onFinalDomesticChange,
  onFinalInternationalChange,
  disabled,
}: LifetimeGroupProps) {
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
      <h2 className="text-lg font-bold text-stone-100 mb-1">Lifetime Totals</h2>
      <p className="text-xs text-stone-500 mb-4">
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
        />
        {showDomesticWarning && (
          <p className="text-xs text-amber-400/90 -mt-2">
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
        />
        {showIntlWarning && (
          <p className="text-xs text-amber-400/90 -mt-2">
            Final international is below your opening prediction — unusual but allowed.
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-cinema-800">
          <span className="text-sm text-stone-400">Worldwide Final</span>
          <span className="text-base font-bold text-theater-gold">
            {formatMillions(worldwideFinal)}
          </span>
        </div>
      </div>
    </div>
  );
}
