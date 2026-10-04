'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MovieGrossSnapshot extends Model {
    static associate(models) {
      MovieGrossSnapshot.belongsTo(models.Movie, { foreignKey: 'movie_id' });
    }
  }

  MovieGrossSnapshot.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    movie_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // "domestic", "international", or a territory's BOM release ID.
    scope: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    captured_on: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    gross: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'MovieGrossSnapshot',
    tableName: 'movie_gross_snapshots',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['movie_id', 'scope', 'captured_on'],
        name: 'unique_movie_gross_snapshot',
      },
    ],
  });

  return MovieGrossSnapshot;
};
