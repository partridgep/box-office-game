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
  imdbRating: number | null,
  imdbVotes: number | null,
  internationalGross: string | null,
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
