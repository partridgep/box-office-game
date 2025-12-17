'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Movie extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    // define association here
    }
  }
  Movie.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    imdbID: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        len: [4, 4],
      },
    },
    plot: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    poster: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    domesticGross: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    internationalGross: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    worldwideGross: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    domesticOpening: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    internationalOpening: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    budget: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rated: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    released: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    runtime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    genre: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    director: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    writer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    actors: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    awards: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metascore: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imdbRating: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    imdbVotes: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    production: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rottenTomatoesScore: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metacriticRating: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Movie',
    tableName: 'movies',
    timestamps: true
  });
return Movie;
};
