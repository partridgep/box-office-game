'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MovieBomTerritory extends Model {
    static associate(models) {
      MovieBomTerritory.belongsTo(models.Movie, { foreignKey: 'movie_id' });
    }
  }

  MovieBomTerritory.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    movie_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    release_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    market: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // BOM area code (e.g. "PT"), learned from the territory's weekend table.
    region: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    release_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    opening: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    gross: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    // Title-page gross at the time the weekend table was last scraped.
    periods_gross: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    periods_scraped_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'MovieBomTerritory',
    tableName: 'movie_bom_territories',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['movie_id', 'release_id'],
        name: 'unique_movie_bom_territory',
      },
    ],
  });

  return MovieBomTerritory;
};
