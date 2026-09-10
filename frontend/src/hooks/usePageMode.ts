import { useMemo } from "react";
import { MovieData, SavedMovie, Guess } from "../types";
import { getPredictionAvailability } from "../utils/predictionWindows";
import { hasAnyActuals } from "../utils/guessComparison";

export type PageMode =
  | "notInArena"
  | "predict"
  | "waiting"
  | "results"
  | "closed";

export function usePageMode(
  movie: MovieData | SavedMovie | null,
  loggedGuess: Guess | undefined,
  isInDatabase: boolean
): PageMode {
  return useMemo(() => {
    if (!movie) return "notInArena";
    if (!isInDatabase) return "notInArena";

    const availability = getPredictionAvailability(movie);

    if (loggedGuess) {
      return hasAnyActuals(movie) ? "results" : "waiting";
    }

    if (availability.anyOpen) return "predict";
    return "closed";
  }, [movie, loggedGuess, isInDatabase]);
}
