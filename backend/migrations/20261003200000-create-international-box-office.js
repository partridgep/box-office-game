'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = {
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
    };

    await queryInterface.createTable('movie_bom_territories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      movie_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      release_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      market: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      region: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      release_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      opening: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      gross: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      periods_gross: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      periods_scraped_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...timestamps,
    });

    await queryInterface.addConstraint('movie_bom_territories', {
      fields: ['movie_id', 'release_id'],
      type: 'unique',
      name: 'unique_movie_bom_territory',
    });

    await queryInterface.addConstraint('movie_bom_territories', {
      fields: ['movie_id'],
      type: 'foreign key',
      name: 'fk_movie_bom_territories_movie',
      references: { table: 'movies', field: 'id' },
      onDelete: 'CASCADE',
    });

    await queryInterface.createTable('movie_gross_snapshots', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      movie_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      scope: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      captured_on: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      gross: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      ...timestamps,
    });

    await queryInterface.addConstraint('movie_gross_snapshots', {
      fields: ['movie_id', 'scope', 'captured_on'],
      type: 'unique',
      name: 'unique_movie_gross_snapshot',
    });

    await queryInterface.addConstraint('movie_gross_snapshots', {
      fields: ['movie_id'],
      type: 'foreign key',
      name: 'fk_movie_gross_snapshots_movie',
      references: { table: 'movies', field: 'id' },
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('movie_gross_snapshots');
    await queryInterface.dropTable('movie_bom_territories');
  },
};
