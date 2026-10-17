const db = require('../models');
const { Guess, User, Follow } = db;

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

const fetchGuessFromId = async (guess_id) => {

  try {

    console.log("guess_id: ", guess_id)

    if (!guess_id) {
      return res.status(400).json({ error: "Guess ID is required" });
    }

    const guess = await Guess.findOne({
      where: { id: guess_id },
      include: [
        {
          model: User,
          as: "guess_user",
          attributes: ["id", "name", "short_id"],
        },
      ],
    });
    return guess;

   } catch (error) {
    throw new Error("Error fetching guess: " + error.message);
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

/**
 * Guesses for a movie as seen by `viewerId`: the viewer's own guess and guesses from users they follow
 * keep their identity and are flagged; everyone else's are anonymized so the endpoint can't be used to
 * scrape who guessed what.
 */
const fetchAllGuessesForMovie = async (movie_id, viewerId) => {

  try {
    if (!movie_id) {
      throw new Error("Movie ID is required");
    }

    const [guesses, follows] = await Promise.all([
      Guess.findAll({
        where: { movie_id: movie_id },
        include: [
          {
            model: User,
            as: "guess_user",
            attributes: ["id", "name", "short_id"],
          },
        ],
      }),
      viewerId
        ? Follow.findAll({
            where: { follower_id: viewerId },
            attributes: ["following_id"],
            raw: true,
          })
        : [],
    ]);

    const followingIds = new Set(follows.map((f) => String(f.following_id)));

    return guesses.map((guess) => {
      const { user_id, guess_user, ...rest } = guess.get({ plain: true });
      const is_viewer = viewerId != null && String(user_id) === String(viewerId);
      const is_friend = !is_viewer && followingIds.has(String(user_id));

      return is_viewer || is_friend
        ? { ...rest, user_id, guess_user, is_viewer, is_friend }
        : { ...rest, is_viewer, is_friend };
    });

   } catch (error) {
    throw new Error("Error fetching guess: " + error.message);
  }
};

module.exports = {
  createGuess,
  fetchGuessFromId,
  fetchGuessesForUser,
  fetchAllGuessesForMovie
};
