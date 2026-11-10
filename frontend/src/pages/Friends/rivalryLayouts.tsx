import { Fragment } from "react";
import type { Guess, MovieData, RunPhase } from "../../types";
import {
  buildRivalryMetrics,
  type RivalryMetric,
} from "../Guesses/GuessMetricCards";

function closerLabel(
  closer: RivalryMetric["closer"],
  friendName: string
): string | null {
  if (closer === "you") return "You closer";
  if (closer === "them") return `${friendName} closer`;
  if (closer === "tie") return "Tied";
  return null;
}

function scorecardCellState(m: RivalryMetric) {
  const yourMuted = m.closer === "them";
  const theirMuted = m.closer === "you";
  const yourWon = m.closer === "you";
  const theirWon = m.closer === "them";
  return {
    yourWon,
    theirWon,
    yourClass: yourMuted
      ? "text-xs font-normal text-stone-400 sm:text-sm"
      : yourWon
        ? "text-sm font-bold text-theater-gold sm:text-base"
        : "text-sm font-semibold text-theater-gold sm:text-[0.9375rem]",
    theirClass: theirMuted
      ? "text-xs font-normal text-stone-400 sm:text-sm"
      : theirWon
        ? "text-sm font-bold text-stone-100 sm:text-base"
        : "text-sm font-semibold text-stone-100 sm:text-[0.9375rem]",
  };
}

/** Dense one-line-per-field comparison. */
export function RivalryScorecard({
  yours,
  theirs,
  movie,
  phase,
  friendName,
}: {
  yours: Guess;
  theirs: Guess;
  movie: MovieData;
  phase: RunPhase;
  friendName: string;
}) {
  const metrics = buildRivalryMetrics(yours, theirs, movie, phase);
  if (metrics.length === 0) return null;

  return (
    <div className="mt-3.5 border-t border-theater-gold/20 pt-3.5 sm:mt-4 sm:pt-4">
      <table
        className="w-full border-collapse sm:hidden"
        aria-label={`You versus ${friendName} scorecard`}
      >
        <thead>
          <tr className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
            <th
              scope="col"
              className="w-0 pb-3 text-center font-semibold whitespace-nowrap"
            >
              You
            </th>
            <th scope="col" className="w-0 px-3 pb-2">
              <span className="sr-only">versus</span>
            </th>
            <th
              scope="col"
              className="w-0 pb-3 text-center font-semibold whitespace-nowrap"
            >
              {friendName}
            </th>
            <th scope="col" className="w-0 px-3 pb-2">
              <span className="sr-only">actual</span>
            </th>
            <th
              scope="col"
              className="w-0 pb-3 text-center font-semibold whitespace-nowrap"
            >
              Actual
            </th>
            <th scope="col" className="w-full p-0">
              <span className="sr-only">Notes</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => {
            const cells = scorecardCellState(m);
            const note =
              closerLabel(m.closer, friendName) ??
              (m.actualDisplay ? null : "Awaiting");
            return (
              <Fragment key={m.key}>
                <tr>
                  <th
                    scope="rowgroup"
                    colSpan={6}
                    className={[
                      "text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-400",
                      i === 0 ? "" : "pt-2.5",
                    ].join(" ")}
                  >
                    <span className="flex items-baseline justify-between gap-x-3">
                      <span className="text-left">{m.label}</span>
                      {note ? (
                        <span className="text-right font-medium normal-case tracking-normal text-stone-400">
                          {note}
                        </span>
                      ) : null}
                    </span>
                  </th>
                </tr>
                <tr className="tabular-nums">
                  <td
                    className={[
                      "w-0 text-center sm:text-right align-baseline whitespace-nowrap",
                      cells.yourClass,
                    ].join(" ")}
                  >
                    {cells.yourWon ? (
                      <>
                        <span aria-hidden>★ </span>
                        <span className="sr-only">Closer: </span>
                      </>
                    ) : null}
                    {m.yourDisplay ?? "—"}
                  </td>
                  <td
                    className="w-0 px-3 text-center align-baseline text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-500"
                    aria-hidden
                  >
                    vs
                  </td>
                  <td
                    className={[
                      "w-0 text-center sm:text-right align-baseline whitespace-nowrap",
                      cells.theirClass,
                    ].join(" ")}
                  >
                    {cells.theirWon ? (
                      <>
                        <span aria-hidden>★ </span>
                        <span className="sr-only">Closer: </span>
                      </>
                    ) : null}
                    {m.theirDisplay ?? "—"}
                  </td>
                  <td
                    className="w-0 px-3 text-center align-baseline text-stone-500"
                    aria-hidden
                  >
                    →
                  </td>
                  <td className="w-0 text-right align-baseline whitespace-nowrap text-sm font-semibold text-white">
                    {m.actualDisplay ?? "—"}
                  </td>
                  <td className="w-full p-0" aria-hidden />
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <ul
        className="hidden space-y-2.5 sm:block"
        aria-label={`You versus ${friendName} scorecard`}
      >
        {metrics.map((m) => {
          const cells = scorecardCellState(m);
          const note =
            closerLabel(m.closer, friendName) ??
            (m.actualDisplay ? null : "Awaiting");
          return (
            <li
              key={m.key}
              className="grid grid-cols-[7rem_1fr_auto] items-baseline gap-x-4"
            >
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-400">
                {m.label}
              </span>
              <span className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
                <span className={cells.yourClass}>
                  {cells.yourWon ? (
                    <>
                      <span aria-hidden>★ </span>
                      <span className="sr-only">Closer: </span>
                    </>
                  ) : null}
                  {m.yourDisplay ?? "—"}
                </span>
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  vs
                </span>
                <span className={cells.theirClass}>
                  {cells.theirWon ? (
                    <>
                      <span aria-hidden>★ </span>
                      <span className="sr-only">Closer: </span>
                    </>
                  ) : null}
                  {m.theirDisplay ?? "—"}
                </span>
                {m.actualDisplay ? (
                  <>
                    <span className="text-stone-500" aria-hidden>
                      →
                    </span>
                    <span className="text-[0.9375rem] font-semibold text-white">
                      {m.actualDisplay}
                    </span>
                  </>
                ) : null}
              </span>
              <span className="text-right text-xs text-stone-400">{note}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
