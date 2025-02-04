const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { fetchBoxOfficeData } = require('../services/boxOfficeService');
const db = require('../models')
const { Movie } = db

const getMovieSearch = async (req, res) => {
    const { search } = req.query;
    console.log("movie search")
    console.log(process.env.OMDB_API_KEY)

    if (!search) {
        return res.status(400).json({ error: 'Search parameter is required' });
    }

    try {
        const response = await fetch(`http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&s=${encodeURIComponent(search)}&type=movie&y=2025`);
        console.log(response)
        const data = await response.json();
        console.log(data)

        if (data.Response === 'False') {
            return res.status(404).json({ error: data.Error });
            
        }

        const movies = data.Search;

        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch movies from OMDb API' });
    }
};

const getMovieDetails = async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'id parameter is required' });
    }

    try {
        // Fetch detailed movie data from OMDb
        const omdbResponse = await fetch(`http://www.omdbapi.com/?i=${id}&apikey=${process.env.OMDB_API_KEY}`);
        const omdbData = await omdbResponse.json();

        if (omdbData.Response === 'False') {
            return res.status(404).json({ error: omdbData.Error });
        }
        console.log({ omdbData })

        // Fetch box office data directly using the service
        const boxOfficeData = await fetchBoxOfficeData(id);
        console.log({ boxOfficeData })

        // Combine the data
        const combinedData = {
            ...omdbData,
            ...boxOfficeData,
        };

        res.json(combinedData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
};

const saveMovieDetails = async (req, res) => {
    try {
        // Extract movie data from the request body
        const movieData = req.body;

        console.log('New movie:', movieData);
    
        // Insert the movie into the database
        const savedMovie = await Movie.create(movieData);
    
        // Send a success response
        res.status(201).json({
          message: 'Movie saved successfully',
          movie: savedMovie,
        });
      } catch (error) {
        console.error('Error saving movie:', error);
        res.status(500).json({
          message: 'Failed to save movie',
          error: error.message,
        });
      }
}

const deleteMovieFromDB = async (req, res) => {

    const { imdbID } = req.query;

    if (!imdbID) {
        return res.status(400).json({ error: 'imdbID parameter is required' });
    }

    try {
        const deletedCount = await Movie.destroy({ where: { imdbID } });
        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        res.status(200).json({ message: 'Movie deleted successfully' });
      } catch (error) {
        console.error('Error removing movie:', error);
        res.status(500).json({
          message: 'Failed to remove movie',
          error: error.message,
        });
      }
}

const getSavedMovies = async (req, res) => {
    try {
        const foundMovies = await Movie.findAll({
            order: [['released', 'ASC']], // Sort by 'released' in ascending order
        });
        console.log({foundMovies})
        res.status(200).json(foundMovies.map(movie => movie.get({ plain: true })));
    } catch (error) {
        res.status(500).send("Server error")
        console.log(error)
    }
};

module.exports = {
    getMovieSearch,
    getMovieDetails,
    saveMovieDetails,
    deleteMovieFromDB,
    getSavedMovies
};