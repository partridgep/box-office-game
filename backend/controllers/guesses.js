const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const {
  createGuess,
} = require('../services/guessService');

const postGuess = async (req, res) => {
  console.log("post guess", req.body)
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

module.exports = {
  postGuess
};