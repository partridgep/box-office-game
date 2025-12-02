import { useState } from "react";
import { useUserStore } from '../../store/useUserStore';
import UserSignup from "./../UserSignup/UserSignupPrompt";
import UserConfirmation from "./../UserSignup/UserConfirmation";
import { postGuess } from '../../services/guesses.service';
import styles from './MovieGuessForm.module.css';

interface GuessFormProps {
  movieId: string;
}

export default function GuessForm({ movieId }: GuessFormProps) {
  const user = useUserStore((state) => state.user);
  const [formData, setFormData] = useState({
    domestic_opening: "",
    international_opening: "",
    final_domestic: "",
    final_international: "",
    rotten_tomatoes_score: "",
  });

  const [showSignup, setShowSignup] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      console.log("no user")
      setShowSignup(true);
      return;
    }
    else {
      console.log(user)
    }

    const guessData = {
      user_id: user.id,
      movie_id: movieId,
      domestic_opening: parseInt(formData.domestic_opening) || null,
      international_opening: parseInt(formData.international_opening) || null,
      final_domestic: parseInt(formData.final_domestic) || null,
      final_international: parseInt(formData.final_international) || null,
      rotten_tomatoes_score: parseInt(formData.rotten_tomatoes_score),
    };

    const response = await postGuess(guessData);
    console.log(response)

    if (response.status == 201) {
      setMessage("Your guess has been submitted!");
      setFormData({
        domestic_opening: "",
        international_opening: "",
        final_domestic: "",
        final_international: "",
        rotten_tomatoes_score: "",
      });
    } else {
      setMessage("Failed to submit guess. Please try again.");
    }
  };

  if (showSignup) {
    return (
      <UserSignup
        onSignup={() => {
          setShowSignup(false);
          setShowConfirmation(true);
        }}
      />
    );
  }

  if (showConfirmation) {
    return (
      <UserConfirmation
        onDone={() => {
          setShowConfirmation(false);
        }}
      />
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold">Make Your Predictions</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Domestic Opening */}
          <div className={styles.field}>
            <label htmlFor="domestic_opening" className="font-medium">
              Domestic Opening ($M)
            </label>
            <input
              id="domestic_opening"
              type="number"
              name="domestic_opening"
              value={formData.domestic_opening}
              onChange={handleChange}
              className="border rounded p-2"
            />
          </div>

          {/* International Opening */}
          <div className={styles.field}>
            <label htmlFor="international_opening" className="font-medium">
              International Opening ($M)
            </label>
            <input
              id="international_opening"
              type="number"
              name="international_opening"
              value={formData.international_opening}
              onChange={handleChange}
              className="border rounded p-2"
            />
          </div>

          {/* Final Domestic */}
          <div className={styles.field}>
            <label htmlFor="final_domestic" className="font-medium">
              Final Domestic ($M)
            </label>
            <input
              id="final_domestic"
              type="number"
              name="final_domestic"
              value={formData.final_domestic}
              onChange={handleChange}
              className="border rounded p-2"
            />
          </div>

          {/* Final International */}
          <div className={styles.field}>
            <label htmlFor="final_international" className="font-medium">
              Final International ($M)
            </label>
            <input
              id="final_international"
              type="number"
              name="final_international"
              value={formData.final_international}
              onChange={handleChange}
              className="border rounded p-2"
            />
          </div>

          {/* Rotten Tomatoes Score */}
          <div className={styles.field}>
            <label htmlFor="rotten_tomatoes_score" className="font-medium">
              Rotten Tomatoes Score (%)
            </label>
            <input
              id="rotten_tomatoes_score"
              type="number"
              name="rotten_tomatoes_score"
              value={formData.rotten_tomatoes_score}
              onChange={handleChange}
              className="border rounded p-2"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={styles.submitBtn}
          >
            Submit Guess
          </button>
        </form>

      {message && <p className="text-green-500 mt-2">{message}</p>}
    </div>
  );
}
