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
const {
  emptyMovieRefreshSummary,
  pushError,
  startJobRun,
  finishJobRun,
  resolveMovieRefreshStatus,
} = require("../services/jobRunService");
const db = require('../models');
const { Movie } = db;
const { Op } = db.Sequelize;

async function refreshInReleaseBoxOffice(summary) {
  const movies = await Movie.findAll({
    where: { bomReleaseId: { [Op.ne]: null } },
  });

  for (const movie of movies) {
    try {
      const latestPeriod = await getLatestPeriod(movie.id);
      if (!isInRelease(movie, latestPeriod)) {
        summary.boxOfficeSkipped += 1;
        continue;
      }

      const saved = await refreshBoxOfficePeriods(movie);
      summary.boxOfficeRefreshed += 1;
      console.log(`Box office periods: ${movie.title} (${saved} rows)`);
    } catch (err) {
      summary.boxOfficeFailed += 1;
      pushError(summary, {
        stage: 'box_office',
        movieId: movie.id,
        title: movie.title,
        message: err.message || String(err),
      });
      console.error(`Failed to refresh box office periods for ${movie.title}:`, err);
    }

    await waitBetweenBomRequests();
  }
}

async function refreshTrackedTerritories(trackedIds, summary) {
  if (trackedIds.size === 0) return;

  const movies = await Movie.findAll({ where: { id: [...trackedIds] } });

  for (const movie of movies) {
    try {
      const result = await refreshTerritoryPeriods(movie);

      if (!result.due) {
        summary.territoriesSkipped += 1;
        continue;
      }

      summary.territoryMarketsDue += result.due || 0;
      summary.territoryMarketsScraped += result.scraped || 0;
      summary.territoryMarketsFailed += result.failed || 0;

      if (result.scraped > 0) {
        summary.territoriesRefreshed += 1;
      }

      if (result.failed > 0) {
        summary.territoriesFailed += 1;
        pushError(summary, {
          stage: 'territories',
          movieId: movie.id,
          title: movie.title,
          message:
            `${result.failed}/${result.due} territory scrapes failed` +
            ` (${result.scraped} scraped, ${result.rows} rows saved)`,
        });
      } else if (result.scraped === 0) {
        // Due markets but nothing scraped and nothing marked failed.
        summary.territoriesFailed += 1;
        pushError(summary, {
          stage: 'territories',
          movieId: movie.id,
          title: movie.title,
          message: `0/${result.due} territory scrapes completed`,
        });
      }

      console.log(`Territory periods: ${movie.title}`, result);
    } catch (err) {
      summary.territoriesFailed += 1;
      pushError(summary, {
        stage: 'territories',
        movieId: movie.id,
        title: movie.title,
        message: err.message || String(err),
      });
      console.error(`Failed to refresh territory periods for ${movie.title}:`, err);
    }
  }
}

async function runMovieRefresh({ trigger = 'unknown' } = {}) {
  console.log("Running movie refresh...");

  const BATCH_SIZE = 5;
  const summary = emptyMovieRefreshSummary();
  let jobRun = null;

  try {
    jobRun = await startJobRun({ job: 'movie_refresh', trigger });
  } catch (err) {
    console.error('Failed to create job_run row:', err);
  }

  try {
    const movies = await Movie.findAll();
    const trackedIds = await getTrackedMovieIds();
    summary.moviesTotal = movies.length;

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

              summary.moviesUpdated += 1;
              console.log(`Updated: ${movie.title}`);
            } else {
              summary.moviesSkipped += 1;
            }
          } catch (err) {
            summary.moviesFailed += 1;
            pushError(summary, {
              stage: 'movie_update',
              movieId: movie.id,
              title: movie.title,
              message: err.message || String(err),
            });
            console.error(`Failed to update movie ${movie.title}:`, err);
          }
        })
      );
    }

    await refreshInReleaseBoxOffice(summary);
    await refreshTrackedTerritories(trackedIds, summary);

    const status = resolveMovieRefreshStatus(summary);
    console.log("Movie refresh completed.", status, summary);

    if (jobRun) {
      await finishJobRun(jobRun.id, { status, summary });
    }

    return {
      success: status !== 'failed',
      status,
      jobRunId: jobRun?.id || null,
      summary,
    };
  } catch (err) {
    console.error("Error during movie refresh:", err);
    pushError(summary, {
      stage: 'fatal',
      message: err.message || String(err),
    });

    if (jobRun) {
      await finishJobRun(jobRun.id, {
        status: 'failed',
        summary,
      });
    }

    return {
      success: false,
      status: 'failed',
      jobRunId: jobRun?.id || null,
      summary,
      error: err.message || String(err),
    };
  }
}

module.exports = runMovieRefresh;
