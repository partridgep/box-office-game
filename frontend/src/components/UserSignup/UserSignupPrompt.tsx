import { useState } from "react";
import { useUserStore } from "../../store/useUserStore";
import styles from "./UserSignupPrompt.module.css"

export default function UserSignup({ onSignup }: { onSignup?: () => void }) {
  const createUser = useUserStore((state) => state.createUser);
  const [name, setName] = useState("");
  const [showError, setshowError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      try {
        await createUser(name);
        onSignup && onSignup();
      }
      catch {
        setshowError(true);
      }
    }
  };

  if (showError) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Something went wrong!</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <button type="submit" className={styles.button}>
            Try Again
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Welcome! Enter your name to get started:</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2"
          required
        />
        <button type="submit" className={styles.button}>
          Continue
        </button>
      </form>
    </div>
  );
}
