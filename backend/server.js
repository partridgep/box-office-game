require('dotenv').config();
const express = require('express');
const routes = require('./routes');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use('/api', routes);

const PORT = 5005;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

