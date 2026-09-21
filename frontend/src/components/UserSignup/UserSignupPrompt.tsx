import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useUserStore } from "../../store/useUserStore";
import styles from "./UserSignupPrompt.module.css"

export default function UserSignup({ onSignup }: { onSignup?: () => void }) {
  const createUser = useUserStore((state) => state.createUser);
  const [name, setName] = useState("");
  const [showError, setshowError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isSaving) {
      setIsSaving(true);
      try {
        await createUser(name);
        onSignup && onSignup();
      }
      catch {
        setshowError(true);
        setIsSaving(false);
      }
    }
  };

  if (showError) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Something went wrong!</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <button type="submit" className={styles.button} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className={styles.spinner} size={16} aria-hidden />
                Saving...
              </>
            ) : (
              "Try Again"
            )}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Enter your name to save your guess</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-black/40 bg-transparent p-2 text-black focus:outline-none focus:ring-2 focus:ring-black/30"
          required
          disabled={isSaving}
        />
        <button type="submit" className={styles.button} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className={styles.spinner} size={16} aria-hidden />
              Saving...
            </>
          ) : (
            "Continue"
          )}
        </button>
      </form>
    </div>
  );
}
