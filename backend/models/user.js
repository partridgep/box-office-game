'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.hasMany(models.Guess, { 
        foreignKey: "user_id",
        as: "guesses" 
      });
      // Users I follow
      User.belongsToMany(models.User, {
        through: models.Follow,
        as: "following",
        foreignKey: "follower_id",
        otherKey: "following_id"
      });
      // Users I follow
      User.belongsToMany(models.User, {
        through: models.Follow,
        as: 'followers',
        foreignKey: 'following_id',
        otherKey: 'follower_id'
      });
    }
  }
  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    short_id: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    access_key_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name_normalized: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    followers_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    following_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true
  });
return User;
};