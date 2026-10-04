'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('movie_box_office_periods', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      movie_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      region: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'domestic',
      },
      period_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      period_number: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      gross: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      gross_to_date: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      theaters: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      is_estimate: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addConstraint('movie_box_office_periods', {
      fields: ['movie_id', 'region', 'period_type', 'start_date'],
      type: 'unique',
      name: 'unique_movie_box_office_period',
    });

    await queryInterface.addConstraint('movie_box_office_periods', {
      fields: ['movie_id'],
      type: 'foreign key',
      name: 'fk_movie_box_office_periods_movie',
      references: { table: 'movies', field: 'id' },
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('movie_box_office_periods');
  },
};
