const { getMovieById, updateMovieDetails } = require("../services/movieService");
const db = require('../models');
const { Movie } = db;

async function runMovieRefresh() {

  console.log("Running movie refresh...");

  const BATCH_SIZE = 5;

  try {

    const movies = await Movie.findAll();

    for (let i = 0; i < movies.length; i += BATCH_SIZE) {

      const batch = movies.slice(i, i + BATCH_SIZE);

      console.log(`Processing batch ${i / BATCH_SIZE + 1}`);

      await Promise.all(
        batch.map(async (movie) => {

          try {

            const updatedMovieData = await getMovieById(movie.tmdbID);

            if (updatedMovieData) {

              await updateMovieDetails(movie.tmdbID, updatedMovieData);

              console.log(`Updated: ${movie.title}`);

            }

          } catch (err) {

            console.error(`Failed to update movie ${movie.title}:`, err);

          }

        })
      );

    }

    console.log("Movie refresh completed.");

    return { success: true };

  } catch (err) {

    console.error("Error during movie refresh:", err);

    return { success: false, error: err };

  }

}

module.exports = runMovieRefresh;
