import type { Guess, GuessMovieSnippet, MovieData } from "../../types";
import type { GuessMovieRow } from "./guessUpdates";

function snippetAsMovie(snippet: GuessMovieSnippet): MovieData {
  return {
    id: snippet.id,
    title: snippet.title,
    tmdbID: String(snippet.tmdbID),
    poster: snippet.poster ?? "",
    released: (snippet.released ?? new Date(0)) as Date,
    domesticOpening: snippet.domesticOpening,
    internationalOpening: snippet.internationalOpening,
    domesticGross: snippet.domesticGross,
    internationalGross: snippet.internationalGross,
    worldwideGross: snippet.worldwideGross,
    rottenTomatoesScore: snippet.rottenTomatoesScore,
    runPhase: snippet.runPhase,
    runPhaseAt: snippet.runPhaseAt,
    latestWeeklyGross: snippet.latestWeeklyGross ?? null,
    // Unused on Guesses rows — satisfy MovieData.
    actors: "",
    awards: null,
    budget: "",
    country: "",
    director: "",
    genre: "",
    imdbID: "",
    imdbRating: null,
    imdbVotes: null,
    language: "",
    metacriticRating: null,
    metascore: null,
    plot: "",
    production: null,
    rated: "",
    runtime: "",
    writer: "",
    year: 0,
  };
}

export function joinGuessRows(
  guesses: Record<string, Guess>,
  movies: Record<string, MovieData> | MovieData[]
): GuessMovieRow[] {
  const byId = new Map<string, MovieData>();
  const list = Array.isArray(movies) ? movies : Object.values(movies);
  for (const movie of list) {
    if (movie.id) byId.set(String(movie.id), movie);
  }

  const joined: GuessMovieRow[] = [];
  for (const guess of Object.values(guesses)) {
    let movie = byId.get(String(guess.movie_id));

    if (movie && guess.movie) {
      movie = {
        ...movie,
        runPhase: guess.movie.runPhase ?? movie.runPhase,
        runPhaseAt: guess.movie.runPhaseAt ?? movie.runPhaseAt,
        latestWeeklyGross:
          guess.movie.latestWeeklyGross ?? movie.latestWeeklyGross ?? null,
      };
    } else if (!movie && guess.movie) {
      movie = snippetAsMovie(guess.movie);
    }

    if (!movie) continue;
    joined.push({ guess, movie });
  }
  return joined;
}
