import { useId, useState } from "react";
import { Lock } from "lucide-react";
import { Guess, MovieData } from "../../types";
import { formatMillions } from "../../utils/formatMoney";
import {
  formatRank,
  getMovieActuals,
  overallRanking,
  rankGuessOnField,
} from "../../utils/guessComparison";

interface SocialProofProps {
  movie: MovieData;
  allMovieGuesses: Guess[];
  friendGuesses: Guess[];
  /** False hides friends' numbers and the crowd median, so players can't anchor on them before locking in. */
  revealGuesses: boolean;
  /** When true, skip outer chrome (parent supplies frosted panel) */
  bare?: boolean;
  /** Under "About this movie": h3 + shared subsection title weight */
  subsection?: boolean;
}

/** Fewer than this many other guesses and the median would just expose individual strangers' picks. */
const MIN_CROWD = 3;

type SegmentId = "opening" | "final" | "reception";

const SEGMENTS: {
  id: SegmentId;
  label: string;
  announce: string;
  rankField: "Worldwide Opening" | "Worldwide Final" | "Rotten Tomatoes";
  rankHeader: string;
  rankTitle: string;
}[] = [
  {
    id: "opening",
    label: "Opening",
    announce: "Showing opening weekend predictions",
    rankField: "Worldwide Opening",
    rankHeader: "Opening rank",
    rankTitle: "Rank for opening weekend (worldwide)",
  },
  {
    id: "final",
    label: "Final",
    announce: "Showing final box office predictions",
    rankField: "Worldwide Final",
    rankHeader: "Final rank",
    rankTitle: "Rank for final box office (worldwide)",
  },
  {
    id: "reception",
    label: "Reception",
    announce: "Showing Rotten Tomatoes predictions",
    rankField: "Rotten Tomatoes",
    rankHeader: "RT rank",
    rankTitle: "Rank for Rotten Tomatoes score",
  },
];

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

type Line = {
  domOpening: number;
  intOpening: number;
  wwOpening: number;
  domFinal: number;
  intFinal: number;
  wwFinal: number;
  rt: number | null;
};

const lineFor = (g: Guess): Line => ({
  domOpening: g.domestic_opening,
  intOpening: g.international_opening,
  wwOpening: g.domestic_opening + g.international_opening,
  domFinal: g.final_domestic,
  intFinal: g.final_international,
  wwFinal: g.final_domestic + g.final_international,
  rt: g.rotten_tomatoes_score,
});

const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function lockedAgo(iso: string): string {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days === 0) return "Locked in today";
  return `Locked in ${relativeTime.format(days, "day")}`;
}

const formatRt = (rt: number | null) => (rt == null ? "—" : `${Math.round(rt)}%`);

/** Opening by default; Reception when only RT actuals are in so far. */
function defaultSegment(movie: MovieData): SegmentId {
  const a = getMovieActuals(movie);
  const hasBo =
    a.worldwideOpening != null ||
    a.worldwideFinal != null ||
    a.domesticOpening != null ||
    a.finalDomestic != null;
  if (!hasBo && a.rottenTomatoesScore != null) return "reception";
  return "opening";
}

const stickyWho =
  "sticky left-0 z-10 bg-cinema-950/95 backdrop-blur-sm py-2 pl-4 pr-3 text-left";
const cell = (emphasis: boolean) =>
  `py-2 pl-3 text-right tabular-nums ${emphasis ? "text-stone-100 font-medium" : "text-stone-300"}`;

export default function SocialProof({
  movie,
  allMovieGuesses,
  friendGuesses,
  revealGuesses,
  bare,
  subsection = false,
}: SocialProofProps) {
  const count = allMovieGuesses.length;
  const viewerGuess = allMovieGuesses.find((g) => g.is_viewer);
  const others = allMovieGuesses.filter((g) => !g.is_viewer);
  const lines = others.map(lineFor);

  const crowdBo =
    others.length >= MIN_CROWD
      ? {
          domOpening: median(lines.map((l) => l.domOpening))!,
          intOpening: median(lines.map((l) => l.intOpening))!,
          wwOpening: median(lines.map((l) => l.wwOpening))!,
          domFinal: median(lines.map((l) => l.domFinal))!,
          intFinal: median(lines.map((l) => l.intFinal))!,
          wwFinal: median(lines.map((l) => l.wwFinal))!,
          rt: null as number | null,
        }
      : null;

  const rtValues = lines.flatMap((l) => (l.rt == null ? [] : [l.rt]));
  const crowdRt =
    rtValues.length >= MIN_CROWD ? median(rtValues) : null;

  const [segment, setSegment] = useState<SegmentId>(() => defaultSegment(movie));
  const [segmentMovieId, setSegmentMovieId] = useState(movie.id);
  if (segmentMovieId !== movie.id) {
    setSegmentMovieId(movie.id);
    setSegment(defaultSegment(movie));
  }
  const segmentMeta = SEGMENTS.find((s) => s.id === segment)!;
  const groupName = useId();
  const actuals = getMovieActuals(movie);

  const showSegmentRank =
    revealGuesses &&
    ((segment === "opening" && actuals.worldwideOpening != null) ||
      (segment === "final" && actuals.worldwideFinal != null) ||
      (segment === "reception" && actuals.rottenTomatoesScore != null));

  const showCrowdRow =
    revealGuesses &&
    (segment === "reception" ? crowdRt != null : crowdBo != null);

  const crowdLine: Line | null = showCrowdRow
    ? segment === "reception"
      ? {
          domOpening: 0,
          intOpening: 0,
          wwOpening: 0,
          domFinal: 0,
          intFinal: 0,
          wwFinal: 0,
          rt: crowdRt,
        }
      : { ...crowdBo!, rt: crowdRt }
    : null;

  const overallLabel = (g: Guess) => {
    const r = overallRanking(g, allMovieGuesses, movie);
    return r ? `${r.overallRank} of ${r.totalGuesses} overall` : null;
  };

  const segmentRankLabel = (g: Guess) => {
    const r = rankGuessOnField(g, allMovieGuesses, movie, segmentMeta.rankField);
    return r ? formatRank(r.rank, r.total) : "—";
  };

  const summary =
    count === 0
      ? "Be the first to place a prediction on this title."
      : `${count} prediction${count === 1 ? "" : "s"} placed${
          friendGuesses.length
            ? ` · ${friendGuesses.length} from friend${friendGuesses.length === 1 ? "" : "s"}`
            : ""
        }`;

  const showTable = revealGuesses
    ? Boolean(crowdBo || crowdRt != null || friendGuesses.length || viewerGuess)
    : friendGuesses.length > 0;

  const valueCells = (line: Line, emphasis = false) => {
    const cls = cell(emphasis);
    if (segment === "opening") {
      return (
        <>
          <td className={cls}>{formatMillions(line.domOpening)}</td>
          <td className={cls}>{formatMillions(line.intOpening)}</td>
          <td className={cls}>{formatMillions(line.wwOpening)}</td>
        </>
      );
    }
    if (segment === "final") {
      return (
        <>
          <td className={cls}>{formatMillions(line.domFinal)}</td>
          <td className={cls}>{formatMillions(line.intFinal)}</td>
          <td className={cls}>{formatMillions(line.wwFinal)}</td>
        </>
      );
    }
    return <td className={cls}>{formatRt(line.rt)}</td>;
  };

  const metricHeaders =
    segment === "reception" ? (
      <th scope="col" className="py-2 pl-3 font-medium text-right">
        <abbr title="Rotten Tomatoes" className="no-underline">
          RT
        </abbr>
      </th>
    ) : (
      <>
        <th scope="col" className="py-2 pl-3 font-medium text-right">
          <abbr title="Domestic" className="no-underline">
            Dom
          </abbr>
        </th>
        <th scope="col" className="py-2 pl-3 font-medium text-right">
          <abbr title="International" className="no-underline">
            Int
          </abbr>
        </th>
        <th scope="col" className="py-2 pl-3 font-medium text-right">
          <abbr title="Worldwide" className="no-underline">
            WW
          </abbr>
        </th>
      </>
    );

  const whoCell = (
    label: string,
    opts: {
      overall?: string | null;
      sealedTime?: string;
      className?: string;
      labelClass?: string;
    } = {}
  ) => (
    <th scope="row" className={`${stickyWho} ${opts.className ?? ""}`}>
      <span className={`block truncate max-w-[10rem] ${opts.labelClass ?? ""}`}>
        {label}
      </span>
      {opts.overall && (
        <span className="block text-xs font-normal text-stone-400 tabular-nums">
          {opts.overall}
        </span>
      )}
      {opts.sealedTime && (
        <time
          dateTime={opts.sealedTime}
          className="block text-xs font-normal text-stone-400"
        >
          {lockedAgo(opts.sealedTime)}
        </time>
      )}
    </th>
  );

  const showSealedFooter = !revealGuesses && count > 0;

  const titleClass = subsection
    ? "text-lg text-left font-semibold text-stone-100 uppercase tracking-wider mb-2"
    : "text-xl text-left font-semibold text-stone-200 uppercase tracking-wider mb-2";

  const chrome = (
    <>
      {subsection ? (
        <h3 className={titleClass}>Prediction Pool</h3>
      ) : (
        <h2 className={titleClass}>Prediction Pool</h2>
      )}
      <p
        className={`text-sm text-left ${
          count === 0 ? "text-stone-400" : "font-medium text-stone-200"
        }`}
      >
        {summary}
      </p>

      {revealGuesses && showTable && (
        <fieldset className="mt-4 min-w-0">
          <legend className="sr-only">Prediction metrics</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-stone-700/60 bg-cinema-950/50 p-1">
            {SEGMENTS.map((seg) => {
              const selected = segment === seg.id;
              return (
                <label
                  key={seg.id}
                  className={`relative flex cursor-pointer items-center justify-center rounded-md px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-theater-gold ${
                    selected
                      ? "bg-theater-gold text-cinema-950"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <input
                    type="radio"
                    name={groupName}
                    value={seg.id}
                    checked={selected}
                    onChange={() => setSegment(seg.id)}
                    className="sr-only"
                  />
                  {seg.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {revealGuesses && showTable ? segmentMeta.announce : ""}
      </p>
    </>
  );

  const table = showTable ? (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm text-left [&_th:last-child]:pr-4 [&_td:last-child]:pr-4">
        <caption className="sr-only">
          {revealGuesses
            ? `${segmentMeta.announce}. Domestic, international and worldwide figures where shown, from the crowd, you and your friends.`
            : "Friends who have predicted this movie. Their numbers stay sealed until you lock in your own prediction."}
        </caption>
        <thead>
          {revealGuesses ? (
            <tr className="text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-700/60">
              <th scope="col" className={`${stickyWho} font-medium`}>
                Player
              </th>
              {metricHeaders}
              {showSegmentRank && (
                <th
                  scope="col"
                  className="py-2 pl-3 font-medium text-right"
                  title={segmentMeta.rankTitle}
                >
                  <abbr title={segmentMeta.rankTitle} className="no-underline">
                    {segmentMeta.rankHeader}
                  </abbr>
                </th>
              )}
            </tr>
          ) : (
            <tr className="text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-700/60">
              <th scope="col" className={`${stickyWho} font-medium`}>
                Friend
              </th>
              <th scope="col" className="py-2 pl-3 font-medium text-right">
                Prediction
              </th>
            </tr>
          )}
        </thead>
        <tbody
          key={revealGuesses ? segment : "sealed"}
          className="pool-segment-swap divide-y divide-stone-800/80"
        >
          {revealGuesses && crowdLine && (
            <tr>
              {whoCell("Median", {
                className: "font-normal text-stone-400",
              })}
              {valueCells(crowdLine)}
              {showSegmentRank && (
                <td className="py-2 pl-3 pr-1 text-right text-stone-500">—</td>
              )}
            </tr>
          )}
          {revealGuesses && viewerGuess && (
            <tr className="bg-theater-gold/5">
              {whoCell("You", {
                overall: overallLabel(viewerGuess),
                className: "text-theater-gold",
                labelClass: "font-semibold",
              })}
              {valueCells(lineFor(viewerGuess), true)}
              {showSegmentRank && (
                <td className="py-2 pl-3 pr-1 text-right tabular-nums text-theater-gold">
                  {segmentRankLabel(viewerGuess)}
                </td>
              )}
            </tr>
          )}
          {friendGuesses.map((g) => (
            <tr key={g.id}>
              {whoCell(g.guess_user?.name ?? "Friend", {
                overall: revealGuesses ? overallLabel(g) : null,
                sealedTime: revealGuesses ? undefined : g.createdAt,
                className: "font-medium text-stone-100",
              })}
              {revealGuesses ? (
                <>
                  {valueCells(lineFor(g))}
                  {showSegmentRank && (
                    <td className="py-2 pl-3 pr-1 text-right tabular-nums text-stone-300">
                      {segmentRankLabel(g)}
                    </td>
                  )}
                </>
              ) : (
                <td className="py-2 pl-3 pr-1 text-right text-xs text-stone-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Lock size={12} aria-hidden />
                    Sealed until you lock in
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;

  const sealedFooter = showSealedFooter ? (
    <p className="mt-3 text-xs text-left text-stone-400">
      Lock in your prediction to see how others called it.
    </p>
  ) : null;

  // Table is full-bleed (no side/bottom pad). Parent shell uses overflow-hidden
  // so the sticky Who column clips to the card's bottom-left radius.
  if (bare) {
    return (
      <>
        <div className={`px-4 pt-4 ${!showTable && !showSealedFooter ? "pb-4" : ""}`}>
          {chrome}
        </div>
        {table}
        {showSealedFooter && <div className="px-4 pb-4">{sealedFooter}</div>}
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-cinema-800 bg-cinema-900/30">
      <div className={`px-4 pt-4 ${!showTable && !showSealedFooter ? "pb-4" : ""}`}>
        {chrome}
      </div>
      {table}
      {showSealedFooter && <div className="px-4 pb-4">{sealedFooter}</div>}
    </div>
  );
}
