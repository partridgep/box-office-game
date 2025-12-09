'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'name_normalized', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: ''
    });
    await queryInterface.addIndex('users', ['name_normalized']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'name_normalized');
    await queryInterface.removeIndex('users', ['name_normalized']);
  }
};
