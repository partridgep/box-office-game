const express = require('express');
const { getBoxOfficeData } = require('../controllers/boxOfficeController');
const { getRottenTomatoesScore } = require('../controllers/rottenTomatoesController');
const {
    getMovieSearch,
    getMovieDetails,
    saveMovieDetails,
    updateMovie,
    deleteMovieFromDB,
    getSavedMovies
} = require('../controllers/movies');

const router = express.Router();

router.get('/box-office', getBoxOfficeData);
router.get('/rotten-tomatoes', getRottenTomatoesScore);
router.get('/search-movies', getMovieSearch);
router.get('/movie', getMovieDetails);
router.post('/movie/save', saveMovieDetails);
router.put('/movie/:imdbID', updateMovie);
router.delete('/movie/delete', deleteMovieFromDB);
router.get('/all-movies', getSavedMovies);

module.exports = router;
