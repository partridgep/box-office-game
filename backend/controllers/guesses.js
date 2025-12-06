const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const {
  createGuess,
  fetchGuessesForUser
} = require('../services/guessService');

const postGuess = async (req, res) => {
    try {
        const savedGuess = await createGuess(req);
        console.log("saved guess: ", savedGuess)
        res.status(201).json({
          status: 201,
          message: "Guess posted successfully!",
          data: savedGuess
        });
    } catch (error) {
        console.error("Error posting guess:", error);
        res.status(500).json({ error: error.message });
    }
};

const getGuessesForUser = async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
      return res.status(400).json({ error: 'user_id parameter is required' });
  }

  try {
    const guesses = await fetchGuessesForUser(user_id);
    res.status(200).json({
        status: 200,
        message: "Fetched guesses for user",
        data: guesses
      });
  } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to fetch guesses for user' });
  }
};

module.exports = {
  postGuess,
  getGuessesForUser
};