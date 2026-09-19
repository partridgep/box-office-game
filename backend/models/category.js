'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      Category.belongsToMany(models.Movie, {
        through: models.MovieCategory,
        foreignKey: 'category_id',
        otherKey: 'movie_id',
        as: 'movies',
      });
      Category.hasMany(models.MovieCategory, {
        foreignKey: 'category_id',
        as: 'memberships',
      });
      Category.hasMany(models.MovieCompGroup, {
        foreignKey: 'category_id',
        as: 'compGroups',
      });
    }
  }

  Category.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    lobby_label: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    comp_label: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    display_in_lobby: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    sequelize,
    modelName: 'Category',
    tableName: 'categories',
    timestamps: true,
  });

  return Category;
};
