'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.changeColumn('movies', 'plot', {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'poster', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'domesticGross', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'internationalGross', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'worldwideGross', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'domesticOpening', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'budget', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'rated', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'released', {
        type: Sequelize.DATE,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'runtime', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'genre', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'director', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'writer', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'actors', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'language', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'country', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'awards', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'metascore', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'imdbRating', {
        type: Sequelize.FLOAT,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'imdbVotes', {
        type: Sequelize.BIGINT,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'production', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'rottenTomatoesScore', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('movies', 'metacriticRating', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
    ]);
  },

  async down (queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.changeColumn('movies', 'plot', {
        type: Sequelize.TEXT,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'poster', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'domesticGross', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'internationalGross', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'worldwideGross', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'domesticOpening', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'budget', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'rated', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'released', {
        type: Sequelize.DATE,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'runtime', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'genre', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'director', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'writer', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'actors', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'language', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'country', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'awards', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'metascore', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'imdbRating', {
        type: Sequelize.FLOAT,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'imdbVotes', {
        type: Sequelize.BIGINT,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'production', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'rottenTomatoesScore', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn('movies', 'metacriticRating', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
    ]);
  }
};
