import { useState } from "react";
import { useUser } from "../../hooks/useUser";
import UserSignup from "./../UserSignup/UserSignupPrompt";

interface GuessFormProps {
  movieId: string;
}

export default function GuessForm({ movieId }: GuessFormProps) {
  const { user, createUser } = useUser();
  const [formData, setFormData] = useState({
    domestic_opening: "",
    international_opening: "",
    final_domestic: "",
    final_international: "",
    rotten_tomatoes_score: "",
  });

  const [showSignup, setShowSignup] = useState(false);
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

    const response = await fetch("/api/guesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(guessData),
    });

    if (response.ok) {
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

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-lg font-bold">Make Your Predictions</h2>

      {showSignup ? (
        <UserSignup />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label>Domestic Opening ($M):</label>
          <input
            type="number"
            name="domestic_opening"
            value={formData.domestic_opening}
            onChange={handleChange}
            className="border p-2"
          />

          <label>International Opening ($M):</label>
          <input
            type="number"
            name="international_opening"
            value={formData.international_opening}
            onChange={handleChange}
            className="border p-2"
          />

          <label>Final Domestic ($M):</label>
          <input
            type="number"
            name="final_domestic"
            value={formData.final_domestic}
            onChange={handleChange}
            className="border p-2"
          />

          <label>Final International ($M):</label>
          <input
            type="number"
            name="final_international"
            value={formData.final_international}
            onChange={handleChange}
            className="border p-2"
          />

          <label>Rotten Tomatoes Score (%):</label>
          <input
            type="number"
            name="rotten_tomatoes_score"
            value={formData.rotten_tomatoes_score}
            onChange={handleChange}
            className="border p-2"
            required
          />

          <button type="submit" className="bg-blue-500 text-white p-2 rounded">
            Submit Guess
          </button>
        </form>
      )}

      {message && <p className="text-green-500 mt-2">{message}</p>}
    </div>
  );
}
