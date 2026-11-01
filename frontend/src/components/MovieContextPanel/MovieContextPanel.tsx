import { MovieData, Guess, CompGroup } from "../../types";
import SocialProof from "../SocialProof/SocialProof";
import HistoricalComps from "../HistoricalComps/HistoricalComps";
import MovieDetailsCard from "./MovieDetailsCard";

interface MovieContextPanelProps {
  movie: MovieData;
  allMovieGuesses: Guess[];
  friendGuesses: Guess[];
  revealGuesses: boolean;
  compGroups?: CompGroup[];
  /**
   * "stack": Pool + Details + Comps (predict/waiting).
   * "wide": Details + Comps only — Pool lives in the results reel.
   */
  variant?: "stack" | "wide";
  /** Linked brushing with prediction sliders (predict layout). */
  onHighlightComp?: (compMovieId: string | null) => void;
}

const frosted =
  "overflow-hidden rounded-xl border-2 border-stone-600/50 bg-cinema-950/30 backdrop-blur-xl";
/** Results "wide" layout: flush below sm; cards regain chrome from sm up */
const frostedWide =
  "overflow-hidden rounded-none sm:rounded-xl border-0 sm:border-2 border-stone-600/50 bg-transparent sm:bg-cinema-950/30 backdrop-blur-none sm:backdrop-blur-xl";

export default function MovieContextPanel({
  movie,
  allMovieGuesses,
  friendGuesses,
  revealGuesses,
  compGroups = [],
  variant = "stack",
  onHighlightComp,
}: MovieContextPanelProps) {
  const isWide = variant === "wide";
  const shell = isWide ? frostedWide : frosted;

  const details = isWide ? (
    <div className={`${shell} p-4`}>
      <MovieDetailsCard movie={movie} bare subsection />
    </div>
  ) : (
    <MovieDetailsCard movie={movie} />
  );

  const comps = movie.id ? (
    <div className={`${shell} p-4`}>
      <HistoricalComps
        groups={compGroups}
        subjectMovieId={movie.id}
        subsection={isWide}
        onHighlightComp={onHighlightComp}
      />
    </div>
  ) : null;

  if (isWide) {
    return (
      <div className="space-y-8 bg-cinema-950/90 backdrop-blur-md sm:space-y-6 sm:bg-transparent sm:backdrop-blur-none">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 sm:gap-6 items-start">
          <div className="min-w-0">{details}</div>
          <div className="min-w-0">{comps}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={shell}>
        <SocialProof
          movie={movie}
          allMovieGuesses={allMovieGuesses}
          friendGuesses={friendGuesses}
          revealGuesses={revealGuesses}
          bare
        />
      </div>
      {details}
      {comps}
    </div>
  );
}
