const db = require('../models');
const { Guess } = db;

// Decides which movies get expensive history tracking (per-territory
// international scraping and gross snapshots). Every caller goes through
// these two functions, so changing the rule only happens here.

const getTrackedMovieIds = async () => {
    const rows = await Guess.findAll({
        attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('movie_id')), 'movie_id']],
        raw: true,
    });
    return new Set(rows.map((row) => row.movie_id).filter(Boolean));
};

const isMovieTracked = async (movieId) => {
    if (!movieId) return false;
    const guess = await Guess.findOne({ where: { movie_id: movieId }, attributes: ['id'] });
    return Boolean(guess);
};

module.exports = {
    getTrackedMovieIds,
    isMovieTracked,
};
