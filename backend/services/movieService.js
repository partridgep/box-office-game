const db = require('../models');
const { fetchBoxOfficeData } = require('./boxOfficeService');
const { fetchRottenTomatoesData } = require('./rottenTomatoesService');
const { Movie } = db;

// search for movies using OMDb API
const searchMovies = async (search) => {
    const response = await fetch(`http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&s=${encodeURIComponent(search)}&type=movie&y=2025`);
    const data = await response.json();

    if (data.Response === 'False') throw new Error(data.Error);
    return data.Search;
};

// get movie details (OMDb + Box Office data)
const getMovieById = async (id) => {
    console.log("id", id)
    const omdbResponse = await fetch(`http://www.omdbapi.com/?i=${id}&apikey=${process.env.OMDB_API_KEY}`);
    const omdbData = await omdbResponse.json();
    if (omdbData.Response === 'False') throw new Error(omdbData.Error);

    const movieDetails = {
      imdbID: omdbData.imdbID,
      title: omdbData.Title,
      year: parseInt(omdbData.Year),
      plot: omdbData.Plot,
      poster: omdbData.Poster,
      domesticGross: null,
      internationalGross: null,
      worldwideGross: null,
      domesticOpening: null,
      budget: null,
      rated: omdbData.Rated,
      released: new Date(omdbData.Released),
      runtime: omdbData.Runtime,
      genre: omdbData.Genre,
      director: omdbData.Director,
      writer: omdbData.Writer,
      actors: omdbData.Actors,
      language: omdbData.Language,
      country: omdbData.Country,
      awards: omdbData.Awards !== 'N/A' ? omdbData.Awards : null,
      metascore: omdbData.Metascore !== 'N/A' ? omdbData.Metascore : null,
      imdbRating: omdbData.imdbRating !== 'N/A' ? parseFloat(omdbData.imdbRating) : null,
      imdbVotes: omdbData.imdbVotes !== 'N/A' ? parseInt(omdbData.imdbVotes.replace(/,/g, ''), 10) : null,
      production: omdbData.Production !== 'N/A' ? omdbData.Production : null,
      rottenTomatoesScore: omdbData.Ratings.find(rating => rating.Source === "Rotten Tomatoes")?.Value || null,
      metacriticRating: omdbData.Ratings.find(rating => rating.Source === "Metacritic")?.Value || null,
    };

    if (!movieDetails.rottenTomatoesScore) {
      try {
        const rottenTomatoesData = await fetchRottenTomatoesData(movieDetails.title, movieDetails.year);
        console.log("Fetched Rotten Tomatoes Score:", rottenTomatoesData);
        if (rottenTomatoesData) {
          movieDetails.rottenTomatoesScore = rottenTomatoesData;
        }
      } catch (error) {
        console.error("Error fetching Rotten Tomatoes data:", error.message);
      }
    }
    
    const boxOfficeData = await fetchBoxOfficeData(id);
    console.log("combined movie data", { ...movieDetails, ...boxOfficeData });

    return { ...movieDetails, ...boxOfficeData };
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

const updateMovieDetails = async (imdbID, updatedData) => {
    const movie = await Movie.findOne({ where: { imdbID } });
    if (!movie) throw new Error('Movie not found');

    await movie.update(updatedData);
    await movie.changed('updatedAt', true);
    await movie.save();
    return movie;
};

const updateAllMovies = async (imdbID, updatedData) => {
    const movie = await Movie.findOne({ where: { imdbID } });
    if (!movie) throw new Error('Movie not found');

    await movie.update(updatedData);
    await movie.changed('updatedAt', true);
    await movie.save();
    return movie;
};

module.exports = {
    searchMovies,
    getMovieById,
    saveMovie,
    deleteMovie,
    getAllSavedMovies,
    updateMovieDetails,
    updateAllMovies
};
