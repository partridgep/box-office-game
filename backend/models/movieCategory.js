'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MovieCategory extends Model {
    static associate(models) {
      MovieCategory.belongsTo(models.Movie, { foreignKey: 'movie_id' });
      MovieCategory.belongsTo(models.Category, { foreignKey: 'category_id' });
    }
  }

  MovieCategory.init({
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
    modelName: 'MovieCategory',
    tableName: 'movie_categories',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['movie_id', 'category_id'],
        name: 'unique_movie_category',
      },
    ],
  });

  return MovieCategory;
};
