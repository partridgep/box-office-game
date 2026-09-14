'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MovieCompItem extends Model {
    static associate(models) {
      MovieCompItem.belongsTo(models.MovieCompGroup, {
        foreignKey: 'comp_group_id',
        as: 'compGroup',
      });
      MovieCompItem.belongsTo(models.Movie, {
        foreignKey: 'movie_id',
        as: 'movie',
      });
    }
  }

  MovieCompItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    comp_group_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    movie_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'MovieCompItem',
    tableName: 'movie_comp_items',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['comp_group_id', 'movie_id'],
        name: 'unique_comp_group_movie',
      },
    ],
  });

  return MovieCompItem;
};
