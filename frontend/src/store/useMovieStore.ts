import { create } from 'zustand';
import { Guess, MovieData, RunPhase } from '../types';

interface MovieStore {
  movies: Record<string, MovieData>;
  setMovies: (movies: MovieData[]) => void;
  addMovie: (movie: MovieData) => void;
  removeMovie: (id: string) => void;
  /** Merge runPhase from enriched GET /api/guesses payloads. */
  applyRunPhasesFromGuesses: (guesses: Guess[]) => void;
  applyRunPhases: (phases: Record<string, RunPhase>) => void;
}

export const useMovieStore = create<MovieStore>((set) => ({
  movies: {},

  setMovies: (movies) => {
    const movieObject = movies.reduce<Record<string, MovieData>>((acc, movie) => {
      acc[movie.tmdbID] = movie;
      return acc;
    }, {});
    set({ movies: movieObject })
  },

  addMovie: (movie) =>
    set((state) => ({
      movies: { ...state.movies, [movie.tmdbID]: movie },
    })
  ),

  removeMovie: (tmdbID) =>
    set((state) => {
      const updatedMovies = { ...state.movies };
      delete updatedMovies[tmdbID]; // Remove movie from object
      return { movies: updatedMovies };
    }
  ),

  applyRunPhasesFromGuesses: (guesses) =>
    set((state) => {
      let changed = false;
      const next = { ...state.movies };
      for (const guess of guesses) {
        const phase = guess.movie?.runPhase;
        if (!phase || !guess.movie_id) continue;
        const entry = Object.entries(next).find(
          ([, m]) => m.id && String(m.id) === String(guess.movie_id)
        );
        if (!entry) continue;
        const [key, movie] = entry;
        if (movie.runPhase === phase) continue;
        next[key] = {
          ...movie,
          runPhase: phase,
          runPhaseAt: guess.movie?.runPhaseAt ?? movie.runPhaseAt,
        };
        changed = true;
      }
      return changed ? { movies: next } : state;
    }),

  applyRunPhases: (phases) =>
    set((state) => {
      let changed = false;
      const next = { ...state.movies };
      for (const [movieId, phase] of Object.entries(phases)) {
        const entry = Object.entries(next).find(
          ([, m]) => m.id && String(m.id) === String(movieId)
        );
        if (!entry) continue;
        const [key, movie] = entry;
        if (movie.runPhase === phase) continue;
        next[key] = { ...movie, runPhase: phase };
        changed = true;
      }
      return changed ? { movies: next } : state;
    }),
}));