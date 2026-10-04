const { getMovieById, updateMovieDetails } = require("../services/movieService");
const {
  refreshBoxOfficePeriods,
  getLatestPeriod,
  isInRelease,
  waitBetweenBomRequests,
} = require("../services/boxOfficeHistoryService");
const {
  recordTitleSnapshot,
  refreshTerritoryPeriods,
} = require("../services/internationalBoxOfficeService");
const { getTrackedMovieIds } = require("../services/historyTrackingPolicy");
const db = require('../models');
const { Movie } = db;
const { Op } = db.Sequelize;

async function refreshInReleaseBoxOffice() {

  const movies = await Movie.findAll({
    where: { bomReleaseId: { [Op.ne]: null } },
  });

  for (const movie of movies) {

    try {

      const latestPeriod = await getLatestPeriod(movie.id);
      if (!isInRelease(movie, latestPeriod)) continue;

      const saved = await refreshBoxOfficePeriods(movie);
      console.log(`Box office periods: ${movie.title} (${saved} rows)`);

    } catch (err) {

      console.error(`Failed to refresh box office periods for ${movie.title}:`, err);

    }

    await waitBetweenBomRequests();

  }

}

async function refreshTrackedTerritories(trackedIds) {

  if (trackedIds.size === 0) return;

  const movies = await Movie.findAll({ where: { id: [...trackedIds] } });

  for (const movie of movies) {

    try {

      const result = await refreshTerritoryPeriods(movie);
      if (result.due > 0) {
        console.log(`Territory periods: ${movie.title}`, result);
      }

    } catch (err) {

      console.error(`Failed to refresh territory periods for ${movie.title}:`, err);

    }

  }

}

async function runMovieRefresh() {

  console.log("Running movie refresh...");

  const BATCH_SIZE = 5;

  try {

    const movies = await Movie.findAll();
    const trackedIds = await getTrackedMovieIds();

    for (let i = 0; i < movies.length; i += BATCH_SIZE) {

      const batch = movies.slice(i, i + BATCH_SIZE);

      console.log(`Processing batch ${i / BATCH_SIZE + 1}`);

      await Promise.all(
        batch.map(async (movie) => {

          try {

            const updatedMovieData = await getMovieById(movie.tmdbID);

            if (updatedMovieData) {

              await updateMovieDetails(movie.tmdbID, updatedMovieData);

              if (trackedIds.has(movie.id)) {
                await recordTitleSnapshot(movie, updatedMovieData);
              }

              console.log(`Updated: ${movie.title}`);

            }

          } catch (err) {

            console.error(`Failed to update movie ${movie.title}:`, err);

          }

        })
      );

    }

    await refreshInReleaseBoxOffice();
    await refreshTrackedTerritories(trackedIds);

    console.log("Movie refresh completed.");

    return { success: true };

  } catch (err) {

    console.error("Error during movie refresh:", err);

    return { success: false, error: err };

  }

}

module.exports = runMovieRefresh;
