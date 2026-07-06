'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add followers_count and following_count to Users
    await queryInterface.addColumn('users', 'followers_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('users', 'following_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // 2. Create Follows table
    await queryInterface.createTable('follows', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      follower_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      following_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 3. Add unique constraint on (follower_id, following_id)
    await queryInterface.addConstraint('follows', {
      fields: ['follower_id', 'following_id'],
      type: 'unique',
      name: 'unique_follower_following'
    });

    // 4. Add foreign key constraints
    await queryInterface.addConstraint('follows', {
      fields: ['follower_id'],
      type: 'foreign key',
      name: 'fk_follows_follower',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('follows', {
      fields: ['following_id'],
      type: 'foreign key',
      name: 'fk_follows_following',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('follows');
    await queryInterface.removeColumn('users', 'followers_count');
    await queryInterface.removeColumn('users', 'following_count');
  }
};