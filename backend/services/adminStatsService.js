'use strict';

const db = require('../models');
const { Guess, User, Movie, sequelize } = db;
const { Op } = db.Sequelize;

function startOfUtcDay(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function daysAgoUtc(days) {
  const d = startOfUtcDay();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

async function countSince(Model, since) {
  return Model.count({
    where: {
      createdAt: { [Op.gte]: since },
    },
  });
}

function fillDailyCounts(since, rows) {
  const byDay = new Map(
    rows.map((row) => [String(row.day).slice(0, 10), Number(row.count) || 0])
  );
  const filled = [];
  const cursor = new Date(since);
  const end = startOfUtcDay();
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    filled.push({ day: key, count: byDay.get(key) || 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return filled;
}

async function getGuessesByDay(since) {
  const rows = await Guess.findAll({
    attributes: [
      [sequelize.fn('DATE', sequelize.col('createdAt')), 'day'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where: {
      createdAt: { [Op.gte]: since },
    },
    group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
    order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
    raw: true,
  });

  return fillDailyCounts(
    since,
    rows.map((row) => ({
      day: String(row.day),
      count: Number(row.count) || 0,
    }))
  );
}

async function getTopMoviesByGuesses(limit = 10) {
  // Upcoming titles + those released in the last 7 days (UTC day boundary).
  const recentOrUpcomingSince = daysAgoUtc(7);

  const rows = await Guess.findAll({
    attributes: [
      'movie_id',
      [sequelize.fn('COUNT', sequelize.col('Guess.id')), 'guessCount'],
    ],
    include: [
      {
        model: Movie,
        attributes: ['id', 'title', 'tmdbID', 'year', 'poster', 'released'],
        required: true,
        where: {
          released: { [Op.gte]: recentOrUpcomingSince },
        },
      },
    ],
    group: [
      'Guess.movie_id',
      'Movie.id',
      'Movie.title',
      'Movie.tmdbID',
      'Movie.year',
      'Movie.poster',
      'Movie.released',
    ],
    order: [[sequelize.fn('COUNT', sequelize.col('Guess.id')), 'DESC']],
    limit,
    subQuery: false,
    raw: false,
  });

  return rows.map((row) => {
    const plain = row.get({ plain: true });
    const movie = plain.Movie || plain.movie;
    return {
      movieId: plain.movie_id,
      guessCount: Number(plain.guessCount) || 0,
      title: movie?.title ?? 'Unknown',
      tmdbID: movie?.tmdbID ?? null,
      year: movie?.year ?? null,
      poster: movie?.poster ?? null,
    };
  });
}

async function getAdminEngagementStats() {
  const todayStart = startOfUtcDay();
  const sevenDaysAgo = daysAgoUtc(7);
  const thirtyDaysAgo = daysAgoUtc(30);
  const fourteenDaysAgo = daysAgoUtc(14);

  const [
    guessesTotal,
    guessesToday,
    guesses7d,
    guesses30d,
    usersTotal,
    usersToday,
    users7d,
    users30d,
    moviesTotal,
    topMovies,
    guessesByDay,
  ] = await Promise.all([
    Guess.count(),
    countSince(Guess, todayStart),
    countSince(Guess, sevenDaysAgo),
    countSince(Guess, thirtyDaysAgo),
    User.count(),
    countSince(User, todayStart),
    countSince(User, sevenDaysAgo),
    countSince(User, thirtyDaysAgo),
    Movie.count(),
    getTopMoviesByGuesses(10),
    getGuessesByDay(fourteenDaysAgo),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    guesses: {
      total: guessesTotal,
      today: guessesToday,
      last7d: guesses7d,
      last30d: guesses30d,
      byDay: guessesByDay,
    },
    users: {
      total: usersTotal,
      today: usersToday,
      last7d: users7d,
      last30d: users30d,
    },
    movies: {
      total: moviesTotal,
      topByGuesses: topMovies,
    },
  };
}

module.exports = {
  getAdminEngagementStats,
};
