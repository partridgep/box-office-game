export type MovieData = {
  actors: string,
  awards: string | null,
  budget: string,
  country: string,
  director: string,
  domesticGross: string | null,
  domesticOpening: string | null,
  genre: string,
  imdbID: string,
  tmdbID: string,
  imdbRating: number | null,
  imdbVotes: number | null,
  internationalGross: string | null,
  internationalOpening: string | null,
  language: string,
  metacriticRating: string | null | undefined,
  metascore: string | null | undefined,
  plot: string,
  poster: string
  production: string | null,
  rated: string,
  released: Date,
  rottenTomatoesScore: string | null | undefined,
  runtime: string,
  title: string,
  worldwideGross: string | null,
  writer: string,
  year: number,
  id: string | null,
};

export type SavedMovie = {
  id: string,
  createdAt: string,
  updatedAt: string,
}
& MovieData

export interface GuessUser {
  id: number;
  name: string;
  short_id: string;
}

export type Guess = {
  id: string,
  user_id: string,
  movie_id: string,
  domestic_opening: number,
  international_opening: number,
  final_domestic: number,
  final_international: number,
  rotten_tomatoes_score: number,
  createdAt: string,
  updatedAt: string,
  guess_user?: GuessUser; 
};

export type MovieActuals = {
  domesticOpening: number | null;
  internationalOpening: number | null;
  worldwideOpening: number | null;
  finalDomestic: number | null;
  finalInternational: number | null;
  worldwideFinal: number | null;
  rottenTomatoesScore: number | null;
};

export type GuessComparison = {
  field: string;
  guess: number;
  actual: number;
  delta: number;
  percentError: number;
};

export type GuessVsGuess = {
  field: string;
  guessA: number;
  guessB: number;
  actual: number;
  winner: "A" | "B" | "tie";
};

export type CategoryLeaderboard = {
  field: string;
  totalGuesses: number;
  userRank: number; 
  percentile: number;
  bestError: number;
  medianError: number;
};

export type OverallPerformance = {
  overallRank: number;
  totalGuesses: number;
  percentile: number;
};

export type Category = {
  id: string;
  slug: string;
  lobby_label: string | null;
  comp_label: string | null;
  sort_order: number;
  is_active: boolean;
  createdAt?: string;
  updatedAt?: string;
  membershipCount?: number;
  movies?: LobbyMovie[];
};

export type LobbyMovie = {
  id: string;
  tmdbID: string | number;
  imdbID: string;
  title: string;
  year: number;
  poster: string;
  plot?: string;
  rated?: string;
  released?: Date | string | null;
  budget?: string | null;
  director?: string | null;
  actors?: string | null;
  genre?: string | null;
  sortOrder?: number;
};

export type LobbySection = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  movies: LobbyMovie[];
};

export type CompMovie = {
  id: string;
  tmdbID: string | number;
  imdbID: string;
  title: string;
  year: number;
  poster: string;
  domesticOpening: string | null;
  internationalOpening: string | null;
  domesticGross: string | null;
  internationalGross: string | null;
  rottenTomatoesScore: string | null;
  reason: string | null;
  sortOrder: number;
};

export type CompGroup = {
  id: string;
  label: string | null;
  categoryId: string | null;
  sortOrder: number;
  source?: "category" | "manual";
  movies: CompMovie[];
};

export type CompGroupInput = {
  categoryId?: string | null;
  label?: string | null;
  sortOrder?: number;
  items: Array<{
    movieId: string;
    sortOrder?: number;
    reason?: string | null;
  }>;
};

