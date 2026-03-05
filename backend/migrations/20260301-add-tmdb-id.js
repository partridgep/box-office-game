
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    // 1. Add column (nullable first)
    await queryInterface.addColumn('movies', 'tmdbID', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    // 2. Get all existing movies
    const movies = await queryInterface.sequelize.query(
      `SELECT "id", "imdbID" FROM "movies";`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // 3. Fetch TMDB IDs
    for (const movie of movies) {

      if (!movie.imdbID) continue;

      console.log("Fetching TMDB ID for:", movie.imdbID);
      console.log("TMDB API KEY", process.env.TMDB_API_KEY)

      const response = await fetch(
        `https://api.themoviedb.org/3/find/${movie.imdbID}?external_source=imdb_id`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_KEY}`
          }
        }
      );

      const data = await response.json();
      console.log("data")

      const tmdbID = data.movie_results?.[0]?.id;
      console.log("tmdb ID", tmdbID)

      if (!tmdbID) {
        throw new Error(`Missing TMDB ID for ${movie.imdbID}`);
      }

      await queryInterface.sequelize.query(
        `
        UPDATE "movies"
        SET "tmdbID" = :tmdbID
        WHERE "id" = :id
        `,
        {
          replacements: {
            tmdbID,
            id: movie.id
          }
        }
      );
    }

    // 4. Make column NOT NULL
    await queryInterface.changeColumn('movies', 'tmdbID', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    // 5. Add uniqueness constraint
    await queryInterface.addConstraint('movies', {
      fields: ['tmdbID'],
      type: 'unique',
      name: 'movies_tmdbID_unique'
    });

  },

  async down(queryInterface) {

    await queryInterface.removeConstraint(
      'movies',
      'movies_tmdbID_unique'
    );

    await queryInterface.removeColumn('movies', 'tmdbID');

  }
};