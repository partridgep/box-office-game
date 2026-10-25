'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('movies', 'runPhase', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('movies', 'runPhaseAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('movies', 'runPhaseAt');
    await queryInterface.removeColumn('movies', 'runPhase');
  },
};
