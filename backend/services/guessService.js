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

module.exports = {
  createGuess
};
