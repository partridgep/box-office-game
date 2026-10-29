import { create } from 'zustand';
import { Guess } from '../types';

interface GuessStore {
  guesses: Record<string, Guess>;
  /** True after at least one successful or failed fetch for the current session user. */
  loaded: boolean;
  setGuesses: (guesses: Guess[]) => void;
  addGuess: (guess: Guess) => void;
  removeGuess: (id: string) => void;
  getGuessForMovie: (movieId: string) => Guess | undefined;
  /** Clear catalog when the signed-in user changes or logs out. */
  reset: () => void;
}

export const useGuessStore = create<GuessStore>((set, get) => ({
  guesses: {},
  loaded: false,

  setGuesses: (guesses) => {
    const guessObject = guesses.reduce<Record<string, Guess>>((acc, guess) => {
      acc[guess.movie_id] = guess;
      return acc;
    }, {});
    set({ guesses: guessObject, loaded: true })
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
  },

  reset: () => set({ guesses: {}, loaded: false }),
}));
