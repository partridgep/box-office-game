// sync.js
const sequelize = require('./config/database'); // Import your sequelize instance
const Movie = require('./models/Movie'); // Import the Movie model

// Sync the models and create the table
sequelize.sync({ force: false, logging: console.log }) // Enable SQL logging
  .then(() => {
    console.log('Database synced successfully');
    process.exit();
  })
  .catch((error) => {
    console.error('Error syncing database:', error);
    process.exit(1);
  });
