import { create } from 'zustand';
import { Guess } from '../types';

interface GuessStore {
  guesses: Record<string, Guess>;
  setGuesses: (guesses: Guess[]) => void;
  addGuess: (guess: Guess) => void;
  removeGuess: (id: string) => void;
  getGuessForMovie: (movieId: string) => Guess | undefined;
}

export const useGuessStore = create<GuessStore>((set, get) => ({
  guesses: {},

  setGuesses: (guesses) => {
    const guessObject = guesses.reduce<Record<string, Guess>>((acc, guess) => {
      acc[guess.movie_id] = guess;
      return acc;
    }, {});
    set({ guesses: guessObject })
  },

  addGuess: (guess) =>
    set((state) => ({
      guesses: { ...state.guesses, [guess.movie_id]: guess },
    })
  ),

  removeGuess: (movieID) =>
    set((state) => {
      const updatedGuesses = { ...state.guesses };
      delete updatedGuesses[movieID]; // Remove guess from object
      return { guesses: updatedGuesses };
    }
  ),

  getGuessForMovie: (movieId) => {
    return get().guesses[movieId];
  }
}));