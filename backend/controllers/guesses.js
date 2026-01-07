const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const {
  createGuess,
  fetchGuessFromId,
  fetchGuessesForUser,
  fetchAllGuessesForMovie
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

const getGuessFromId = async (req, res) => {
  const { guess_id } = req.params;
  console.log("guess_id: ", guess_id)

  if (!guess_id) {
      return res.status(400).json({ error: 'guess_id parameter is required' });
  }

  try {
    const guesses = await fetchGuessFromId(guess_id);
    res.status(200).json({
        status: 200,
        message: "Fetched guess",
        data: guesses
      });
  } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to fetch guess' });
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

const getAllGuessesForMovie = async (req, res) => {
  const { movie_id } = req.params;
  console.log("movie_id: ", movie_id)

  if (!movie_id) {
      return res.status(400).json({ error: 'movie_id parameter is required' });
  }

  try {
    const guesses = await fetchAllGuessesForMovie(movie_id);
    res.status(200).json({
        status: 200,
        message: "Fetched guesses for movie",
        data: guesses
      });
  } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to fetch all guesses for movie' });
  }
};

module.exports = {
  postGuess,
  getGuessFromId,
  getGuessesForUser,
  getAllGuessesForMovie
};