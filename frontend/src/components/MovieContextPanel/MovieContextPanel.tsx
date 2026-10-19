import { MovieData, Guess, CompGroup } from "../../types";
import SocialProof from "../SocialProof/SocialProof";
import HistoricalComps from "../HistoricalComps/HistoricalComps";

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
}

const frosted =
  "overflow-hidden rounded-xl border-2 border-stone-600/50 bg-cinema-950/30 backdrop-blur-xl";
/** Results "wide" layout: flush below sm; cards regain chrome from sm up */
const frostedWide =
  "overflow-hidden rounded-none sm:rounded-xl border-0 sm:border-2 border-stone-600/50 bg-transparent sm:bg-cinema-950/30 backdrop-blur-none sm:backdrop-blur-xl";

/** Shared subsection title under "About this movie" */
const subsectionHeading =
  "text-lg text-left font-semibold text-stone-100 uppercase tracking-wider";

export default function MovieContextPanel({
  movie,
  allMovieGuesses,
  friendGuesses,
  revealGuesses,
  compGroups = [],
  variant = "stack",
}: MovieContextPanelProps) {
  const releaseDate = movie.released
    ? new Date(movie.released).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "TBA";

  const isWide = variant === "wide";
  const shell = isWide ? frostedWide : frosted;

  const details = (
    <div className={`${shell} p-4 space-y-3`}>
      {isWide ? (
        <h3 className={`${subsectionHeading} mb-5`}>Movie Details</h3>
      ) : (
        <h2 className="text-xl text-left font-semibold text-stone-200 uppercase tracking-wider mb-5">
          Movie Details
        </h2>
      )}
      <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm text-left">
        <span className="text-stone-400">Release</span>
        <span className="text-stone-200 col-span-3">{releaseDate}</span>
        <span className="text-stone-400">Rated</span>
        <span className="text-stone-200 col-span-3">{movie.rated || "Not Yet Rated"}</span>
        <span className="text-stone-400">Budget</span>
        <span className="text-stone-200 col-span-3">{movie.budget || "Unknown"}</span>
        <span className="text-stone-400">Director</span>
        <span className="text-stone-200 col-span-3">{movie.director || "—"}</span>
        <span className="text-stone-400">Genre</span>
        <span className="text-stone-200 col-span-3">{movie.genre || "—"}</span>
        {movie.actors && (
          <>
            <span className="text-stone-400">Cast</span>
            <span className="text-stone-200 col-span-3 line-clamp-2">{movie.actors}</span>
          </>
        )}
      </div>
      {movie.plot && (
        <p className="text-sm text-left text-stone-400 line-clamp-4 mt-5">
          {movie.plot}
        </p>
      )}
    </div>
  );

  const comps = movie.id ? (
    <div className={`${shell} p-4`}>
      <HistoricalComps
        groups={compGroups}
        subjectMovieId={movie.id}
        subsection={isWide}
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
