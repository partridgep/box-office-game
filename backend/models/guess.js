'use strict';
const { Model } = require('sequelize');
const User = require("./user");
const Movie = require("./Movie")

module.exports = (sequelize, DataTypes) => {
  class Guess extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Guess.belongsTo(models.User, { foreignKey: 'user_id' });
      Guess.belongsTo(models.Movie, { foreignKey: 'movie_id' }); 
    }
  }
  Guess.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      references: {
        model: User,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    movie_id: {
      type: DataTypes.UUID,
      references: {
        model: Movie,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    domestic_opening: DataTypes.BIGINT,
    international_opening: DataTypes.BIGINT,
    final_domestic: DataTypes.BIGINT,
    final_international: DataTypes.BIGINT,
    rotten_tomatoes_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
    },
  }, {
    sequelize,
    modelName: 'Guess',
    tableName: 'guesses',
    timestamps: true
  });
return Guess;
};