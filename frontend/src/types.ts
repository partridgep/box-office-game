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
};

export type SavedMovie  = {
  id: string,
  createdAt: string,
  updatedAt: string,
}
& MovieData
