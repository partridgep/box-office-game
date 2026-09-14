'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MovieCompGroup extends Model {
    static associate(models) {
      MovieCompGroup.belongsTo(models.Movie, {
        foreignKey: 'subject_movie_id',
        as: 'subjectMovie',
      });
      MovieCompGroup.belongsTo(models.Category, {
        foreignKey: 'category_id',
        as: 'category',
      });
      MovieCompGroup.hasMany(models.MovieCompItem, {
        foreignKey: 'comp_group_id',
        as: 'items',
        onDelete: 'CASCADE',
      });
    }
  }

  MovieCompGroup.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    subject_movie_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'MovieCompGroup',
    tableName: 'movie_comp_groups',
    timestamps: true,
  });

  return MovieCompGroup;
};
