import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { WeeklyGrossPoint } from "../../data/mockWeeklyGross";
import { formatDollars } from "../../utils/formatMoney";

interface BoxOfficeJourneyChartProps {
  weeklyData: WeeklyGrossPoint[] | null;
  userFinalDomesticPrediction: number | null;
}

function CustomTooltip({
  active,
  payload,
  label,
  predictionDollars,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: number;
  predictionDollars: number | null;
}) {
  if (!active || !payload?.length) return null;
  const cumulative = payload[0].value;
  const pctOfPrediction =
    predictionDollars && predictionDollars > 0
      ? ((cumulative / predictionDollars) * 100).toFixed(0)
      : null;

  return (
    <div className="bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-stone-400">Week {label}</p>
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
  weeklyData,
  userFinalDomesticPrediction,
}: BoxOfficeJourneyChartProps) {
  if (!weeklyData || weeklyData.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center rounded-xl border border-cinema-800 bg-cinema-900/30">
        <p className="text-sm text-stone-500">
          Chart unlocks after opening weekend data is available.
        </p>
      </div>
    );
  }

  const predictionDollars =
    userFinalDomesticPrediction != null
      ? userFinalDomesticPrediction * 1_000_000
      : null;

  const chartData = weeklyData.map((d) => ({
    week: d.week,
    cumulative: d.cumulativeDomestic,
  }));

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider mb-4">
        Box Office Journey
      </h3>
      <div className="h-[260px] w-full rounded-xl border border-cinema-800 bg-cinema-900/30 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="week"
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
            <Tooltip
              content={
                <CustomTooltip predictionDollars={predictionDollars} />
              }
            />
            {predictionDollars != null && (
              <ReferenceLine
                y={predictionDollars}
                stroke="#e6c567"
                strokeDasharray="4 4"
                label={{
                  value: `Your prediction: $${userFinalDomesticPrediction}M`,
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
