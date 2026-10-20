'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MovieBorrowedCategory extends Model {
    static associate(models) {
      MovieBorrowedCategory.belongsTo(models.Movie, {
        foreignKey: 'movie_id',
        as: 'movie',
      });
      MovieBorrowedCategory.belongsTo(models.Category, {
        foreignKey: 'category_id',
        as: 'category',
      });
    }
  }

  MovieBorrowedCategory.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    movie_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'MovieBorrowedCategory',
    tableName: 'movie_borrowed_categories',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['movie_id', 'category_id'],
        name: 'unique_movie_borrowed_category',
      },
    ],
  });

  return MovieBorrowedCategory;
};
