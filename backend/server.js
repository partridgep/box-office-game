require('dotenv').config({ path: './env' });
const express = require('express');
const routes = require('./routes');
const cors = require('cors');
const bodyParser = require('body-parser');
const scheduleMovieRefresh = require("./jobs/movieRefresher");

const app = express();

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use('/api', routes);

const PORT = 5005;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

scheduleMovieRefresh();

