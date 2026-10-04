// One-off: node jobs/backfillBoxOfficePeriods.js [--imdb=tt1234567]
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { scrapeBoxOffice } = require("../scraper");
const {
  refreshBoxOfficePeriods,
  waitBetweenBomRequests,
} = require("../services/boxOfficeHistoryService");
const {
  recordTitleSnapshot,
  refreshTerritoryPeriods,
} = require("../services/internationalBoxOfficeService");
const { getTrackedMovieIds } = require("../services/historyTrackingPolicy");
const db = require("../models");
const { Movie } = db;
const { Op } = db.Sequelize;

const imdbArg = process.argv.find((arg) => arg.startsWith("--imdb="));
const onlyImdbID = imdbArg ? imdbArg.split("=")[1] : null;

async function backfillBoxOfficePeriods() {

  const where = { released: { [Op.lt]: new Date() } };
  if (onlyImdbID) where.imdbID = onlyImdbID;

  const movies = await Movie.findAll({ where, order: [["released", "ASC"]] });
  const trackedIds = await getTrackedMovieIds();

  console.log(`Backfilling box office periods for ${movies.length} movies (${trackedIds.size} tracked)...`);

  let filled = 0;
  let failed = 0;
  let skipped = 0;

  for (const movie of movies) {

    try {

      const isTracked = trackedIds.has(movie.id);
      let titleData = null;

      if (!movie.bomReleaseId || isTracked) {
        titleData = await scrapeBoxOffice(movie.imdbID);
        await waitBetweenBomRequests();
      }

      if (!movie.bomReleaseId && titleData?.bomReleaseId) {
        await movie.update({ bomReleaseId: titleData.bomReleaseId });
      }

      if (movie.bomReleaseId) {
        const saved = await refreshBoxOfficePeriods(movie);
        console.log(`Domestic: ${movie.title} (${saved} rows)`);
        await waitBetweenBomRequests();
      } else {
        console.log(`No domestic release found: ${movie.title}`);
      }

      if (isTracked) {
        const snapshot = await recordTitleSnapshot(movie, titleData);
        const territories = await refreshTerritoryPeriods(movie);
        console.log(`International: ${movie.title}`, { ...snapshot, ...territories });
      }

      if (movie.bomReleaseId || isTracked) {
        filled++;
      } else {
        skipped++;
      }

    } catch (err) {

      console.error(`Failed to backfill ${movie.title}:`, err.message);
      failed++;

    }

  }

  console.log(`Backfill done: ${filled} filled, ${skipped} skipped, ${failed} failed.`);

}

if (require.main === module) {
  backfillBoxOfficePeriods()
    .catch((err) => {
      console.error("Backfill failed:", err);
      process.exitCode = 1;
    })
    .finally(() => db.sequelize.close());
}

module.exports = backfillBoxOfficePeriods;
