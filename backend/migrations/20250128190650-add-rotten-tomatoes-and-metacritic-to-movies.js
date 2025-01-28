'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('movies', 'rottenTomatoesScore', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('movies', 'metacriticRating', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('movies', 'rottenTomatoesScore');
    await queryInterface.removeColumn('movies', 'metacriticRating');
  }
};
