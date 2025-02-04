const express = require('express');
const { getBoxOfficeData } = require('../controllers/boxOfficeController');
const {
    getMovieSearch,
    getMovieDetails,
    saveMovieDetails,
    deleteMovieFromDB,
    getSavedMovies
} = require('../controllers/movies');

const router = express.Router();

router.get('/box-office', getBoxOfficeData);
router.get('/search-movies', getMovieSearch);
router.get('/movie', getMovieDetails);
router.post('/movie/save', saveMovieDetails);
router.delete('/movie/delete', deleteMovieFromDB);
router.get('/all-movies', getSavedMovies);

module.exports = router;
