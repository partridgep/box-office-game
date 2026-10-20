'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('movie_borrowed_categories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      movie_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addConstraint('movie_borrowed_categories', {
      fields: ['movie_id', 'category_id'],
      type: 'unique',
      name: 'unique_movie_borrowed_category',
    });

    await queryInterface.addConstraint('movie_borrowed_categories', {
      fields: ['movie_id'],
      type: 'foreign key',
      name: 'fk_movie_borrowed_categories_movie',
      references: { table: 'movies', field: 'id' },
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('movie_borrowed_categories', {
      fields: ['category_id'],
      type: 'foreign key',
      name: 'fk_movie_borrowed_categories_category',
      references: { table: 'categories', field: 'id' },
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('movie_borrowed_categories');
  },
};
