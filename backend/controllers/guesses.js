const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const {
  createGuess,
} = require('../services/guessService');

const postGuess = async (req, res) => {
    try {
        const movies = await createGuess(req.body);
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
  postGuess
};