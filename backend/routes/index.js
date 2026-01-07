const express = require('express');
const { getBoxOfficeData } = require('../controllers/boxOfficeController');
const { getRottenTomatoesScore } = require('../controllers/rottenTomatoesController');
const {
    getMovieSearch,
    getMovieDetails,
    saveMovieDetails,
    updateMovie,
    deleteMovieFromDB,
    getSavedMovies,
    updateAllMovies,
} = require('../controllers/movies');
const {
    postGuess,
    getGuessFromId,
    getGuessesForUser,
    getAllGuessesForMovie
} = require('../controllers/guesses');
const {
    saveUser,
    recoverAccount
} = require('../controllers/usersController');

const router = express.Router();

router.get('/box-office', getBoxOfficeData);
router.get('/rotten-tomatoes', getRottenTomatoesScore);
router.get('/search-movies', getMovieSearch);
router.get('/movie', getMovieDetails);
router.post('/movie/save', saveMovieDetails);
router.put('/movie/:imdbID', updateMovie);
router.delete('/movie/delete', deleteMovieFromDB);
router.get('/all-movies', getSavedMovies);
router.post('/refresh-movies', updateAllMovies);
router.post('/guess', postGuess);
router.get('/guess/id/:guess_id', getGuessFromId);
router.get('/guesses/movie_id/:movie_id', getAllGuessesForMovie);
router.get('/guesses', getGuessesForUser);
router.post('/users/save', saveUser);
router.post('/users/recover', recoverAccount);

module.exports = router;
