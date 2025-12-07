'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'access_key');

    await queryInterface.addColumn('users', 'access_key_hash', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'access_key_hash');

    await queryInterface.addColumn('users', 'access_key', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  }
};
