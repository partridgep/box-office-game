const cron = require("node-cron");
const { getMovieById, updateMovieDetails } = require("../services/movieService");
const db = require('../models');
const { Movie } = db;

console.log("Movie refresher service initialized...");

const scheduleMovieRefresh = () => {

  // Schedule job to run every 24 hours at midnight
  cron.schedule("0 0 * * *", async () => {
      console.log("Running scheduled movie update...");

      try {
          const movies = await Movie.findAll(); // Fetch all movies from DB

          const updatePromises = movies.map(async (movie) => {
            try {
                const updatedMovieData = await getMovieById(movie.imdbID);
                console.log("updated movie data",updatedMovieData)

                if (updatedMovieData) {
                    await updateMovieDetails(movie.imdbID, updatedMovieData);
                    console.log(`Updated: ${movie.title}`);
                }
            } catch (error) {
                console.error(`Failed to update movie ${movie.title}:`, error);
            }
        });

        await Promise.all(updatePromises);

        console.log('All movies updated successfully.');
      } catch (error) {
          console.error("Error fetching movies for update:", error);
      }
  });
};

module.exports = scheduleMovieRefresh;
