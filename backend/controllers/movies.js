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

// search for movies using OMDb API
const getMovieSearch = async (req, res) => {
    const { search } = req.query;

    if (!search) {
        return res.status(400).json({ error: 'Search parameter is required' });
    }

    try {
        const movies = await searchMovies(search);
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
    const { imdbID } = req.params;
    const updatedData = req.body;
    console.log(imdbID, updatedData)

    if (!imdbID || !updatedData) {
        return res.status(400).json({ error: 'imdbID and updated data are required' });
    }

    try {
        const updatedMovie = await updateMovieDetails(imdbID, updatedData);
        res.status(200).json({ message: 'Movie updated successfully', movie: updatedMovie });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update movie' });
    }
};

module.exports = {
    getMovieSearch,
    getMovieDetails,
    saveMovieDetails,
    deleteMovieFromDB,
    getSavedMovies,
    updateMovie
};