'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("Guesses", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: { type: Sequelize.UUID, references: { model: "Users", key: "id" }, onDelete: "CASCADE" },
      movie_id: { type: Sequelize.UUID, references: { model: "movies", key: "id" }, onDelete: "CASCADE" },
      domestic_opening: Sequelize.BIGINT,
      international_opening: Sequelize.BIGINT,
      final_domestic: Sequelize.BIGINT,
      final_international: Sequelize.BIGINT,
      rotten_tomatoes_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
          max: 100,
        },
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("Guesses");
  }
};
