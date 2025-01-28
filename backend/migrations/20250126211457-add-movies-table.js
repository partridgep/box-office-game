'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('movies', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      imdbID: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          len: [4, 4],
        },
      },
      plot: {
        type: Sequelize.TEXT,
      },
      poster: {
        type: Sequelize.STRING,
      },
      domesticGross: {
        type: Sequelize.STRING,
      },
      internationalGross: {
        type: Sequelize.STRING,
      },
      worldwideGross: {
        type: Sequelize.STRING,
      },
      domesticOpening: {
        type: Sequelize.STRING,
      },
      budget: {
        type: Sequelize.STRING,
      },
      rated: Sequelize.STRING,
      released: Sequelize.DATE,
      runtime: Sequelize.STRING,
      genre: Sequelize.STRING,
      director: Sequelize.STRING,
      writer: Sequelize.STRING,
      actors: Sequelize.STRING,
      language: Sequelize.STRING,
      country: Sequelize.STRING,
      awards: Sequelize.STRING,
      metascore: Sequelize.STRING,
      imdbRating: Sequelize.FLOAT,
      imdbVotes: Sequelize.BIGINT,
      production: Sequelize.STRING,
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('movies');
  },
};
