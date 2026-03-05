const db = require('../models');
const { fetchBoxOfficeData } = require('./boxOfficeService');
const { fetchRottenTomatoesData } = require('./rottenTomatoesService');
const { Movie } = db;

// search for movies using TMDB
const searchMovies = async (search) => {

  const response = await fetch(
    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(search)}&include_adult=false&language=en-US&primary_release_year=2026&page=1`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`TMDB search error: ${response.status}`);
  }

  const data = await response.json();

  return data.results.map(movie => ({
    Title: movie.title,
    Year: movie.release_date
      ? movie.release_date.substring(0,4)
      : "",
    Poster: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : "",
    tmdbID: movie.id
  }));

};

const getMovieById = async (tmdbID, isBatch) => {

  console.log("tmdbID", tmdbID);

  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbID}?append_to_response=credits`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`TMDB error: ${response.status}`);
  }

  const data = await response.json();

  const imdbID = data.imdb_id;

  let directors = [];
  let writers = [];

  for (const member of data.credits.crew) {
    if (member.job === "Director") directors.push(member.name);
    if (member.job === "Writer" || member.job === "Screenplay") writers.push(member.name);
  }

  const actors = [];
  for (let i = 0; i < Math.min(5, data.credits.cast.length); i++) {
    actors.push(data.credits.cast[i].name);
  }

  const movieDetails = {

    tmdbID: data.id,

    imdbID: imdbID,

    title: data.title,

    year: data.release_date
      ? Number(data.release_date.slice(0,4))
      : null,

    plot: data.overview,

    poster: data.poster_path
      ? data.poster_path
      : "",

    domesticGross: null,
    internationalGross: null,
    worldwideGross: data.revenue || null,

    domesticOpening: null,

    budget: data.budget || null,

    rated: null,

    released: data.release_date
      ? new Date(data.release_date)
      : null,

    runtime: data.runtime
      ? `${data.runtime} min`
      : null,

    genre: data.genres
      ?.map(g => g.name)
      .join(", ") ?? null,

    director: directors.length ? directors.join(", ") : null,

    writer: writers.length ? writers.join(", ") : null,

    actors: actors.length ? actors.join(", ") : null,

    language: data.spoken_languages
      ?.map(l => l.english_name)
      .join(", ") ?? null,

    country: data.production_countries
      ?.map(c => c.name)
      .join(", ") ?? null,

    awards: null,

    metascore: null,

    imdbRating: data.vote_average || null,

    imdbVotes: data.vote_count || null,

    production: data.production_companies
      ?.map(p => p.name)
      .join(", ") ?? null,

    rottenTomatoesScore: null,

    metacriticRating: null
  };

  const requests = [];

  if (movieDetails.title) {
    // Rotten Tomatoes scraper (needs title and year)
    requests.push(
      fetchRottenTomatoesData(movieDetails.title, movieDetails.year)
        .catch(e => {
          console.error("RT error:", e.message);
          return null;
        })
    );
  } else {
    requests.push(Promise.resolve(null));
  }

  const isReleased = movieDetails.released && movieDetails.released < new Date();

  if (imdbID && isReleased) {
    requests.push(
      fetchBoxOfficeData(imdbID)
        .catch(e => {
          console.error("Box office error:", e.message);
          return {};
        })
    );
  } else {
    requests.push(Promise.resolve({}));
  }

  const [rtScore, boxOfficeData] = await Promise.all(requests);
  if (rtScore) movieDetails.rottenTomatoesScore = rtScore;

  return {

    ...movieDetails,
    ...boxOfficeData

  };

};

const getMoviesByIdsBatch = async (ids) => {
  if (!ids.length) return [];

  const url = `https://api.imdbapi.dev/titles:batchGet?${ids
    .map(id => `titleIds=${id}`)
    .join("&")}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`IMDb batch API error: ${res.status}`);

  const data = await res.json();
  return data.titles; // array of movie objects in the same order as requested
};

const saveMovie = async (movieData) => {
    return await Movie.create(movieData);
};

const deleteMovie = async (imdbID) => {
    const deletedCount = await Movie.destroy({ where: { imdbID } });
    if (deletedCount === 0) throw new Error('Movie not found');
};

const getAllSavedMovies = async () => {
    const movies = await Movie.findAll({ order: [['released', 'ASC']] });
    return movies.map(movie => movie.get({ plain: true }));
};

const updateMovieDetails = async (tmdbID, updatedData) => {
    console.log("Looking for TMDB ID:", tmdbID);
    console.log("updated data", updatedData)
    const movie = await Movie.findOne({ where: { tmdbID } });
    if (!movie) {
      throw new Error('Movie not found');
    }

    await movie.update(updatedData);
    await movie.changed('updatedAt', true);
    await movie.save();
    return movie;
};

const updateAllMovies = async (tmdbID, updatedData) => {
    const movie = await Movie.findOne({ where: { tmdbID } });
    if (!movie) throw new Error('Movie not found');

    await movie.update(updatedData);
    await movie.changed('updatedAt', true);
    await movie.save();
    return movie;
};

module.exports = {
    searchMovies,
    getMovieById,
    getMoviesByIdsBatch,
    saveMovie,
    deleteMovie,
    getAllSavedMovies,
    updateMovieDetails,
    updateAllMovies
};
