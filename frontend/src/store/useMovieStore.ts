import { create } from 'zustand';
import { MovieData } from '../types';

interface MovieStore {
  movies: Record<string, MovieData>;
  setMovies: (movies: MovieData[]) => void;
  addMovie: (movie: MovieData) => void;
  removeMovie: (id: string) => void;
}

export const useMovieStore = create<MovieStore>((set) => ({
  movies: {},

  setMovies: (movies) => {
    const movieObject = movies.reduce<Record<string, MovieData>>((acc, movie) => {
      acc[movie.imdbID] = movie;
      return acc;
    }, {});
    set({ movies: movieObject })
  },

  addMovie: (movie) =>
    set((state) => ({
      movies: { ...state.movies, [movie.imdbID]: movie },
    })
  ),

  removeMovie: (imdbID) =>
    set((state) => {
      const updatedMovies = { ...state.movies };
      delete updatedMovies[imdbID]; // Remove movie from object
      return { movies: updatedMovies };
    }
  ),
}));