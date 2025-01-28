const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// console.log(process.env)
// console.log(process.env.OMDB_API_KEY)
console.log(process.env.SUPABASE_DB_USER)
console.log(process.env.SUPABASE_DB_PASSWORD)
console.log(process.env.SUPABASE_DB_NAME)
// console.log(process.env.DATABASE_HOST)
console.log(process.env.SUPABASE_DATABASE_PORT)
console.log('Database URL:', process.env.SUPABASE_DATABASE_URL);

module.exports = {
  development: {
    username: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    host: process.env.SUPABASE_HOST,
    port: process.env.SUPABASE_DATABASE_PORT,
    // use_env_variable: process.env.SUPABASE_DATABASE_URL,
    dialect: 'postgres',
    logging: console.log, // Enable detailed logging,
    dialectOptions: {
      connectTimeout: 60000 // Increase timeout to 60 seconds
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 60000, // Increase acquire timeout to 60 seconds
      idle: 10000
    }
  },
  test: {
    // username: process.env.SUPABASE_DB_USER,
    // password: process.env.SUPABASE_DB_PASSWORD,
    // database: process.env.SUPABASE_DB_NAME,
    // host: process.env.DATABASE_HOST,
    use_env_variable: process.env.SUPABASE_DATABASE_URL,
    dialect: "postgres"
  },
  production: {
    // username: process.env.SUPABASE_DB_USER,
    // password: process.env.SUPABASE_DB_PASSWORD,
    // database: process.env.SUPABASE_DB_NAME,
    // host: process.env.DATABASE_HOST,
    use_env_variable: process.env.SUPABASE_DATABASE_URL,
    dialect: "postgres"
  }
}