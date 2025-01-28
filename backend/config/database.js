const { Sequelize } = require('sequelize');
const path = require('path');

// Ensure that the environment variables are correctly loaded
require('dotenv').config({ path: '../.env' });


// console.log('Database URL:', process.env.SUPABASE_DATABASE_URL);

module.exports = {
    development: {
    //   username: process.env.DB_USER || 'postgres',
    //   password: process.env.DB_PASSWORD || 'mysecretpassword',
    //   database: process.env.DB_NAME || 'mydatabase',
    //   host: process.env.DB_HOST || 'localhost',
    //   port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      use_env_variable: process.env.SUPABASE_DATABASE_URL,
    },
    test: {
    //   username: process.env.DB_USER || 'postgres',
    //   password: process.env.DB_PASSWORD || 'mysecretpassword',
    //   database: process.env.TEST_DB_NAME || 'test_database',
    //   host: process.env.DB_HOST || 'localhost',
    //   port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      use_env_variable: process.env.SUPABASE_DATABASE_URL,
    },
    production: {
      use_env_variable: process.env.SUPABASE_DATABASE_URL,
      dialect: 'postgres',
    },
  };