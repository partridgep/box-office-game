require('dotenv').config({ path: './env' });
const express = require('express');
const routes = require('./routes');
const cors = require('cors');
const bodyParser = require('body-parser');
const scheduleMovieRefresh = require("./jobs/movieRefresher");
// const runMovieRefresh = require("./jobs/runMovieRefresh");

const app = express();

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use('/api', routes);

const PORT = 5005;
app.listen(PORT, async () => {
  console.log(`Backend running on http://localhost:${PORT}`);

  // Run once on startup
//   console.log("Starting initial movie refresh...");
//   await runMovieRefresh();

  // Start CRON job
  scheduleMovieRefresh();
});

