const db = require('../models');
const { Guess } = db;

const createGuess = async (req) => {
  try {
    const { user_id, movie_id, domestic_opening, international_opening, final_domestic, final_international, rotten_tomatoes_score } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const newGuess = await Guess.create({
      user_id,
      movie_id,
      domestic_opening,
      international_opening,
      final_domestic,
      final_international,
      rotten_tomatoes_score,
    });

    console.log("newGuess", newGuess)

    return newGuess;
  } catch (error) {
    throw new Error("Error posting guess: " + error.message);
  }
};

const fetchGuessesForUser = async (user_id) => {

  try {

    console.log("user_id: ", user_id)

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const guesses = await Guess.findAll({ where: { user_id } });

    const plainGuesses = guesses.map(guess => guess.get({ plain: true }));
    return plainGuesses;

   } catch (error) {
    throw new Error("Error fetching guesses: " + error.message);
  }
};

module.exports = {
  createGuess,
  fetchGuessesForUser
};
