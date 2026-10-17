import { apiClient } from "./apiClient";
import { Guess } from "../types";

export const postGuess = async (guessData: Record<string, any>) => {
  const response = await fetch('/api/guess', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(guessData),
  });

  if (!response.ok) {
      throw new Error('Failed to save guess');
  }

  return response.json();
};


export const getGuessesForUser = async (user_id: string) => {
  console.log("user_id: ", user_id)
  const response = await fetch(`/api/guesses?user_id=${user_id}`);
  console.log("response: ", response)

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch guesses for user");
  }

  return data;
};

export const getGuessFromId = async (guess_id: string) => {
  const response = await fetch(`/api/guess/id/${guess_id}`);
  const data = await response.json();

  if (!response.ok) {
    console.log("error!", data.error)
    throw new Error(data.error || "Failed to fetch guess");
  }

  return data;
};

/** Sends the JWT when present so the server can flag friends' guesses; strangers' guesses come back anonymized. */
export const getAllGuessesForMovie = (movie_id: string) =>
  apiClient<{ data: Guess[] }>(`/api/guesses/movie_id/${movie_id}`);