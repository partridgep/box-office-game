import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { BoxOfficePoint, InternationalWeeklyPoint } from "../../types";
import { formatDollars } from "../../utils/formatMoney";

type Market = "domestic" | "international" | "worldwide";

const MARKET_LABELS: Record<Market, string> = {
  domestic: "Domestic",
  international: "International",
  worldwide: "Worldwide",
};

interface BoxOfficeJourneyChartProps {
  domesticWeekly: BoxOfficePoint[];
  internationalWeekly: InternationalWeeklyPoint[];
  userFinalDomesticPrediction: number | null;
  userFinalInternationalPrediction: number | null;
}

type ChartPoint = {
  period: number;
  cumulative: number;
  throughDate: string;
  isEstimate: boolean;
};

const formatShortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** Sunday on or after a date, so Fri–Thu domestic weeks line up with Sunday-ending international weeks. */
const toWeekEnding = (iso: string) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7));
  return date.toISOString().slice(0, 10);
};

function toDomesticSeries(points: BoxOfficePoint[]): ChartPoint[] {
  return points
    .filter((p) => p.period != null && p.grossToDate != null)
    .map((p) => ({
      period: p.period as number,
      cumulative: p.grossToDate as number,
      throughDate: p.endDate,
      isEstimate: p.isEstimate,
    }));
}

function toInternationalSeries(points: InternationalWeeklyPoint[]): ChartPoint[] {
  return points.map((p) => ({
    period: p.period,
    cumulative: p.grossToDate,
    throughDate: p.weekEnding,
    isEstimate: false,
  }));
}

function toWorldwideSeries(domestic: ChartPoint[], international: ChartPoint[]): ChartPoint[] {
  const domesticByWeek = new Map(domestic.map((p) => [toWeekEnding(p.throughDate), p]));
  const internationalByWeek = new Map(international.map((p) => [p.throughDate, p]));
  const weeks = [...new Set([...domesticByWeek.keys(), ...internationalByWeek.keys()])].sort();

  let lastDomestic = 0;
  let lastInternational = 0;
  return weeks.map((week, i) => {
    const domesticPoint = domesticByWeek.get(week);
    lastDomestic = domesticPoint?.cumulative ?? lastDomestic;
    lastInternational = internationalByWeek.get(week)?.cumulative ?? lastInternational;
    return {
      period: i + 1,
      cumulative: lastDomestic + lastInternational,
      throughDate: week,
      isEstimate: domesticPoint?.isEstimate ?? false,
    };
  });
}

function CustomTooltip({
  active,
  payload,
  label,
  predictionDollars,
}: {
  active?: boolean;
  payload?: { value: number; payload: ChartPoint }[];
  label?: number;
  predictionDollars: number | null;
}) {
  if (!active || !payload?.length) return null;
  const cumulative = payload[0].value;
  const { throughDate, isEstimate } = payload[0].payload;
  const pctOfPrediction =
    predictionDollars && predictionDollars > 0
      ? ((cumulative / predictionDollars) * 100).toFixed(0)
      : null;

  return (
    <div className="bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-stone-400">
        Week {label} · through {formatShortDate(throughDate)}
        {isEstimate && " (est.)"}
      </p>
      <p className="text-theater-gold font-semibold">
        {formatDollars(cumulative)} cumulative
      </p>
      {pctOfPrediction && (
        <p className="text-stone-500 mt-0.5">{pctOfPrediction}% of your prediction</p>
      )}
    </div>
  );
}

export default function BoxOfficeJourneyChart({
  domesticWeekly,
  internationalWeekly,
  userFinalDomesticPrediction,
  userFinalInternationalPrediction,
}: BoxOfficeJourneyChartProps) {
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  const domestic = toDomesticSeries(domesticWeekly);
  const international = toInternationalSeries(internationalWeekly);
  const series: Record<Market, ChartPoint[]> = {
    domestic,
    international,
    // A worldwide figure missing either side would understate the gross, so require both.
    worldwide:
      domestic.length > 0 && international.length > 0 ? toWorldwideSeries(domestic, international) : [],
  };

  const predictionsMillions: Record<Market, number | null> = {
    domestic: userFinalDomesticPrediction,
    international: userFinalInternationalPrediction,
    worldwide:
      userFinalDomesticPrediction != null && userFinalInternationalPrediction != null
        ? userFinalDomesticPrediction + userFinalInternationalPrediction
        : null,
  };

  const available = (Object.keys(MARKET_LABELS) as Market[]).filter((m) => series[m].length > 0);

  if (available.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center rounded-xl border border-cinema-800 bg-cinema-900/30">
        <p className="text-sm text-stone-500">
          Chart unlocks after the first week of box office data is available.
        </p>
      </div>
    );
  }

  const market = selectedMarket && series[selectedMarket].length > 0 ? selectedMarket : available[0];
  const chartData = series[market];
  const predictionMillions = predictionsMillions[market];
  const predictionDollars = predictionMillions != null ? predictionMillions * 1_000_000 : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider">
          Box Office Journey
        </h3>
        <div
          role="group"
          aria-label="Box office market"
          className="flex rounded-lg border border-cinema-700 bg-cinema-900/60 p-0.5"
        >
          {(Object.keys(MARKET_LABELS) as Market[]).map((m) => {
            const isActive = m === market;
            const isDisabled = series[m].length === 0;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMarket(m)}
                disabled={isDisabled}
                aria-pressed={isActive}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-md transition-colors ${
                  isActive
                    ? "bg-cinema-700 text-theater-gold font-semibold"
                    : "text-stone-400 hover:text-stone-200 disabled:opacity-40 disabled:hover:text-stone-400"
                }`}
              >
                {MARKET_LABELS[m]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-[260px] lg:h-[360px] w-full rounded-xl border border-cinema-800 bg-cinema-900/30 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="period"
              tick={{ fill: "#78716c", fontSize: 11 }}
              axisLine={{ stroke: "#44403c" }}
              tickLine={false}
              label={{ value: "Week", position: "insideBottom", offset: -2, fill: "#78716c", fontSize: 10 }}
            />
            <YAxis
              tick={{ fill: "#78716c", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`}
              width={48}
            />
            <Tooltip content={<CustomTooltip predictionDollars={predictionDollars} />} />
            {predictionDollars != null && (
              <ReferenceLine
                y={predictionDollars}
                ifOverflow="extendDomain"
                stroke="#e6c567"
                strokeDasharray="4 4"
                label={{
                  value: `Your prediction: $${predictionMillions}M`,
                  fill: "#e6c567",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#b92b3c"
              strokeWidth={2}
              dot={{ fill: "#b92b3c", r: 3 }}
              activeDot={{ r: 5, fill: "#e6c567" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
