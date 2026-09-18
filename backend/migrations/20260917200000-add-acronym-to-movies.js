'use strict';

const { generateAcronym } = require('../utils/acronym');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('movies', 'acronym', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    const movies = await queryInterface.sequelize.query(
      `SELECT "id", "title" FROM "movies";`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    for (const movie of movies) {
      const acronym = generateAcronym(movie.title);
      await queryInterface.sequelize.query(
        `UPDATE "movies" SET "acronym" = :acronym WHERE "id" = :id`,
        { replacements: { acronym, id: movie.id } },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('movies', 'acronym');
  },
};
