const express = require('express');
const authenticateUser = require("../middleware/authenticateUser")
const optionalAuth = require("../middleware/optionalAuth")
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
    getMovieBoxOffice,
    refreshMovieBoxOffice,
    refreshMovieInternationalBoxOffice,
    getMovieRunPhases,
} = require('../controllers/movies');
const {
    postGuess,
    getGuessFromId,
    getGuessesForUser,
    getAllGuessesForMovie
} = require('../controllers/guesses');
const {
    saveUser,
    recoverAccount,
    getUserProfile,
    postFollowUser,
    deleteUnfollowUser,
    getIsFollowing,
    postConnectUsers,
    getUserByCode,
    postFollowByCode,
    deleteFollowByCode,
    getMyFollowing
} = require('../controllers/usersController');
const {
    getCategories,
    getCategory,
    postCategory,
    putCategory,
    removeCategory,
    putCategoryMovies,
    getLobby,
    getMovieCompGroups,
    putMovieCompGroups,
    getMovieCategoryMemberships,
    putMovieCategoryMemberships,
    getMovieBorrowedCategories,
    putMovieBorrowedCategories,
} = require('../controllers/categories');
const { getAdminStats, getAdminJobRuns } = require('../controllers/adminStats');

const router = express.Router();

router.get('/box-office', getBoxOfficeData);
router.get('/rotten-tomatoes', getRottenTomatoesScore);
router.get('/search-movies', getMovieSearch);
router.get('/movie', getMovieDetails);
router.post('/movie/save', saveMovieDetails);
router.put('/movie/:tmdbID', updateMovie);
router.delete('/movie/delete', deleteMovieFromDB);
router.get('/all-movies', getSavedMovies);
router.post('/refresh-movies', updateAllMovies);
router.get('/lobby', getLobby);
router.get('/admin/stats', getAdminStats);
router.get('/admin/job-runs', getAdminJobRuns);
router.get('/categories', getCategories);
router.post('/categories', postCategory);
router.get('/categories/:id', getCategory);
router.put('/categories/:id', putCategory);
router.delete('/categories/:id', removeCategory);
router.put('/categories/:id/movies', putCategoryMovies);
router.get('/movies/:movieId/comp-groups', getMovieCompGroups);
router.put('/movies/:movieId/comp-groups', putMovieCompGroups);
router.get('/movies/:movieId/categories', getMovieCategoryMemberships);
router.put('/movies/:movieId/categories', putMovieCategoryMemberships);
router.get('/movies/:movieId/borrowed-categories', getMovieBorrowedCategories);
router.put('/movies/:movieId/borrowed-categories', putMovieBorrowedCategories);
router.get('/movies/run-phases', getMovieRunPhases);
router.get('/movies/:movieId/box-office', getMovieBoxOffice);
router.post('/movies/:movieId/box-office/refresh', refreshMovieBoxOffice);
router.post('/movies/:movieId/box-office/international/refresh', refreshMovieInternationalBoxOffice);
router.post('/guess', postGuess);
router.get('/guess/id/:guess_id', getGuessFromId);
router.get('/guesses/movie_id/:movie_id', optionalAuth, getAllGuessesForMovie);
router.get('/guesses', getGuessesForUser);
router.post('/users/save', saveUser);
router.post('/users/recover', recoverAccount);
router.get('/users/me/following', authenticateUser, getMyFollowing);
router.get('/users/code/:code', optionalAuth, getUserByCode);
router.post('/users/code/:code/follow', authenticateUser, postFollowByCode);
router.delete('/users/code/:code/follow', authenticateUser, deleteFollowByCode);
router.get('/users/:id', getUserProfile);
router.post('/users/:id/follow', authenticateUser, postFollowUser);
router.delete('/users/:id/follow', authenticateUser, deleteUnfollowUser);
router.get('/users/:id/is-following', authenticateUser, getIsFollowing);
router.post('/users/connect', authenticateUser, postConnectUsers);

module.exports = router;
