'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      lobby_label: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      comp_label: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.createTable('movie_categories', {
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

    await queryInterface.addConstraint('movie_categories', {
      fields: ['movie_id', 'category_id'],
      type: 'unique',
      name: 'unique_movie_category',
    });

    await queryInterface.addConstraint('movie_categories', {
      fields: ['movie_id'],
      type: 'foreign key',
      name: 'fk_movie_categories_movie',
      references: { table: 'movies', field: 'id' },
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('movie_categories', {
      fields: ['category_id'],
      type: 'foreign key',
      name: 'fk_movie_categories_category',
      references: { table: 'categories', field: 'id' },
      onDelete: 'CASCADE',
    });

    await queryInterface.createTable('movie_comp_groups', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      subject_movie_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      label: {
        type: Sequelize.STRING,
        allowNull: true,
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

    await queryInterface.addConstraint('movie_comp_groups', {
      fields: ['subject_movie_id'],
      type: 'foreign key',
      name: 'fk_movie_comp_groups_subject',
      references: { table: 'movies', field: 'id' },
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('movie_comp_groups', {
      fields: ['category_id'],
      type: 'foreign key',
      name: 'fk_movie_comp_groups_category',
      references: { table: 'categories', field: 'id' },
      onDelete: 'SET NULL',
    });

    await queryInterface.createTable('movie_comp_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      comp_group_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      movie_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: true,
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

    await queryInterface.addConstraint('movie_comp_items', {
      fields: ['comp_group_id', 'movie_id'],
      type: 'unique',
      name: 'unique_comp_group_movie',
    });

    await queryInterface.addConstraint('movie_comp_items', {
      fields: ['comp_group_id'],
      type: 'foreign key',
      name: 'fk_movie_comp_items_group',
      references: { table: 'movie_comp_groups', field: 'id' },
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('movie_comp_items', {
      fields: ['movie_id'],
      type: 'foreign key',
      name: 'fk_movie_comp_items_movie',
      references: { table: 'movies', field: 'id' },
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('movie_comp_items');
    await queryInterface.dropTable('movie_comp_groups');
    await queryInterface.dropTable('movie_categories');
    await queryInterface.dropTable('categories');
  },
};
