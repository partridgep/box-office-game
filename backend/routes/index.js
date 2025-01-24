const express = require('express');
const { getBoxOfficeData } = require('../controllers/boxOfficeController');
const { getMovieSearch, getMovieDetails } = require('../controllers/movies');

const router = express.Router();

router.get('/box-office', getBoxOfficeData);
router.get('/search-movies', getMovieSearch);
router.get('/movie', getMovieDetails);

module.exports = router;
