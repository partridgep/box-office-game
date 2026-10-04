const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const {
    searchMovies,
    getMovieById,
    saveMovie,
    deleteMovie,
    getAllSavedMovies,
    updateMovieDetails
} = require('../services/movieService');
const { getBoxOfficePeriods, refreshBoxOfficePeriods } = require('../services/boxOfficeHistoryService');
const {
    getInternationalHistory,
    recordTitleSnapshot,
    refreshTerritoryPeriods,
} = require('../services/internationalBoxOfficeService');
const { isMovieTracked } = require('../services/historyTrackingPolicy');
const { scrapeBoxOffice } = require('../scraper');

const internationalRefreshesInFlight = new Set();
const { Movie } = require('../models');
const runMovieRefresh = require("../jobs/runMovieRefresh");

// search for movies
const getMovieSearch = async (req, res) => {
    const { search, year } = req.query;

    if (!search) {
        return res.status(400).json({ error: 'Search parameter is required' });
    }

    try {
        const movies = await searchMovies(search, year);
        console.log("controller response", movies)
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch movies from OMDb API' });
    }
};

// get detailed movie information (OMDb + Box Office data)
const getMovieDetails = async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'id parameter is required' });
    }

    try {
        const movieDetails = await getMovieById(id);
        res.json(movieDetails);
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch movie details' });
    }
};

const saveMovieDetails = async (req, res) => {
    try {
        const savedMovie = await saveMovie(req.body);
        res.status(201).json({
            message: 'Movie saved successfully',
            movie: savedMovie,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Failed to save movie',
            error: error.message,
        });
    }
};

const deleteMovieFromDB = async (req, res) => {
    const { imdbID } = req.query;

    if (!imdbID) {
        return res.status(400).json({ error: 'imdbID parameter is required' });
    }

    try {
        await deleteMovie(imdbID);
        res.status(200).json({ message: 'Movie deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to remove movie' });
    }
};

const getSavedMovies = async (req, res) => {
    try {
        const movies = await getAllSavedMovies();
        res.status(200).json(movies);
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to retrieve movies' });
    }
};

const updateMovie = async (req, res) => {
    console.log("update MOVIE")
    console.log(req.params)
    const { tmdbID } = req.params;
    const updatedData = req.body;
    console.log(tmdbID, updatedData)

    if (!tmdbID || !updatedData) {
        return res.status(400).json({ error: 'tmdbID and updated data are required' });
    }

    try {
        const updatedMovie = await updateMovieDetails(tmdbID, updatedData);
        res.status(200).json({ message: 'Movie updated successfully', movie: updatedMovie });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update movie' });
    }
};

const updateAllMovies = async (req, res) => {
  console.log("Manual request: refreshing movies...");

  const result = await runMovieRefresh();
  console.log(result)
  if (result.success) {
    res.status(200).json({ message: 'Movies refreshed successfully.', data: result });
  } else {
    res.status(500).json({ message: "Failed to refresh movies.", error: result.error });
  }
};

const getBoxOfficeHistory = async (movieId) => {
    const [domestic, international, tracked] = await Promise.all([
        getBoxOfficePeriods(movieId),
        getInternationalHistory(movieId),
        isMovieTracked(movieId),
    ]);
    return { ...domestic, international, tracked };
};

const getMovieBoxOffice = async (req, res) => {
    try {
        res.status(200).json(await getBoxOfficeHistory(req.params.movieId));
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to load box office history' });
    }
};

const refreshMovieBoxOffice = async (req, res) => {
    try {
        const movie = await Movie.findByPk(req.params.movieId);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        if (!movie.bomReleaseId) {
            return res.status(400).json({ error: 'Movie has no Box Office Mojo release ID; run Update Data first' });
        }

        await refreshBoxOfficePeriods(movie);
        res.status(200).json(await getBoxOfficeHistory(movie.id));
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to refresh box office history' });
    }
};

const refreshMovieInternationalBoxOffice = async (req, res) => {
    const { movieId } = req.params;

    if (internationalRefreshesInFlight.has(movieId)) {
        return res.status(409).json({ error: 'A foreign history refresh is already running for this movie' });
    }

    internationalRefreshesInFlight.add(movieId);
    try {
        const movie = await Movie.findByPk(movieId);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        if (!(await isMovieTracked(movie.id))) {
            return res.status(400).json({ error: 'Foreign history is only tracked for movies with at least one guess' });
        }

        const titleData = await scrapeBoxOffice(movie.imdbID);
        const snapshot = await recordTitleSnapshot(movie, titleData);
        const territories = await refreshTerritoryPeriods(movie, { force: req.body?.force === true });

        res.status(200).json({
            ...(await getBoxOfficeHistory(movie.id)),
            refreshResult: { ...snapshot, ...territories },
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to refresh foreign history' });
    } finally {
        internationalRefreshesInFlight.delete(movieId);
    }
};

module.exports = {
    getMovieSearch,
    getMovieDetails,
    saveMovieDetails,
    deleteMovieFromDB,
    getSavedMovies,
    updateMovie,
    updateAllMovies,
    getMovieBoxOffice,
    refreshMovieBoxOffice,
    refreshMovieInternationalBoxOffice
};