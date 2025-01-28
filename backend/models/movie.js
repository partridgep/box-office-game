const { DataTypes, Model } = require('sequelize');

class Movie extends Model {
  static initModel(sequelize) {
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
      },
      poster: {
        type: DataTypes.STRING,
      },
      domesticGross: {
        type: DataTypes.String,
      },
      internationalGross: {
        type: DataTypes.String,
      },
      worldwideGross: {
        type: DataTypes.String,
      },
      domesticOpening: {
        type: DataTypes.String,
      },
      budget: {
        type: DataTypes.String,
      },
      rated: DataTypes.STRING,
      released: DataTypes.DATE,
      runtime: DataTypes.STRING,
      genre: DataTypes.STRING,
      director: DataTypes.STRING,
      writer: DataTypes.STRING,
      actors: DataTypes.STRING,
      language: DataTypes.STRING,
      country: DataTypes.STRING,
      awards: DataTypes.STRING,
      metascore: DataTypes.STRING,
      imdbRating: DataTypes.FLOAT,
      imdbVotes: DataTypes.BIGINT,
      production: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: 'Movie',
    tableName: 'movies',
    timestamps: true,
  });
}
}

module.exports = Movie;
