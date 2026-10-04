'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MovieBoxOfficePeriod extends Model {
    static associate(models) {
      MovieBoxOfficePeriod.belongsTo(models.Movie, { foreignKey: 'movie_id' });
    }
  }

  MovieBoxOfficePeriod.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    movie_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    region: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'domestic',
    },
    period_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['weekly', 'weekend']],
      },
    },
    period_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    gross: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    gross_to_date: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    theaters: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_estimate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    sequelize,
    modelName: 'MovieBoxOfficePeriod',
    tableName: 'movie_box_office_periods',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['movie_id', 'region', 'period_type', 'start_date'],
        name: 'unique_movie_box_office_period',
      },
    ],
  });

  return MovieBoxOfficePeriod;
};
