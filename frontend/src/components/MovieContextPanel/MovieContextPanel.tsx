import { MovieData, Guess, CompGroup } from "../../types";
import SocialProof from "../SocialProof/SocialProof";
import HistoricalComps from "../HistoricalComps/HistoricalComps";

interface MovieContextPanelProps {
  movie: MovieData;
  allMovieGuesses: Guess[];
  compGroups?: CompGroup[];
}

const frosted =
  "rounded-xl border-2 border-stone-600/50 bg-cinema-950/30 backdrop-blur-xl";

export default function MovieContextPanel({
  movie,
  allMovieGuesses,
  compGroups = [],
}: MovieContextPanelProps) {
  const releaseDate = movie.released
    ? new Date(movie.released).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "TBA";

  return (
    <div className="space-y-6">
      <div className={frosted}>
        <SocialProof allMovieGuesses={allMovieGuesses} bare />
      </div>

      <div className={`${frosted} p-4 space-y-3`}>
        <h2 className="text-xl text-left font-semibold text-stone-200 uppercase tracking-wider mb-5">
          Movie Details
        </h2>
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

      <div className={`${frosted} p-4`}>
        <HistoricalComps groups={compGroups} />
      </div>
    </div>
  );
}
