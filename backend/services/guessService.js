const db = require('../models');
const { Guess } = db;

const createGuess = async (req, res) => {
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

    res.status(201).json({ message: "Guess submitted successfully!", guess: newGuess });
  } catch (error) {
    res.status(500).json({ error: "Error submitting guess" });
  }
};

module.exports = {
  createGuess
};
