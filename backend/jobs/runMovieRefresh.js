const { getMovieById, updateMovieDetails } = require("../services/movieService");
const db = require('../models');
const { Movie } = db;

async function runMovieRefresh() {
  console.log("Running movie refresh...");

  try {
    const movies = await Movie.findAll();

    const updatePromises = movies.map(async (movie) => {
      try {
        const updatedMovieData = await getMovieById(movie.imdbID);

        if (updatedMovieData) {
          await updateMovieDetails(movie.imdbID, updatedMovieData);
          console.log(`Updated: ${movie.title}`);
        }
      } catch (err) {
        console.error(`Failed to update movie ${movie.title}:`, err);
      }
    });

    await Promise.all(updatePromises);

    console.log("Movie refresh completed.");
    return { success: true };
  } catch (err) {
    console.error("Error during movie refresh:", err);
    return { success: false, error: err };
  }
}

module.exports = runMovieRefresh;
