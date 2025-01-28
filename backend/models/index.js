const sequelize = require('../config/database');
const Movie = require('./Movie');

// Initialize models
Movie.initModel(sequelize);

// Export models and Sequelize instance
module.exports = {
  sequelize,
  Movie,
};
