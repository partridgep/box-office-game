'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.removeColumn("guesses", "type");
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.addColumn("guesses", "type", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};
