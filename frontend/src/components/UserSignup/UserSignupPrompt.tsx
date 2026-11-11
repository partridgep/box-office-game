import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useUserStore } from "../../store/useUserStore";
import styles from "./UserSignupPrompt.module.css";

export default function UserSignup({
  onSignup,
  onCancel,
  supportingLine,
  showBackButton = true,
}: {
  onSignup?: () => void;
  onCancel?: () => void;
  /** Optional context under the heading (e.g. inviter challenge). */
  supportingLine?: string;
  /** False when the parent renders back outside this form (e.g. left of ticket). */
  showBackButton?: boolean;
}) {
  const createUser = useUserStore((state) => state.createUser);
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const errorId = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await createUser(name);
      onSignup?.();
    } catch {
      setErrorMessage("Something went wrong. Try again.");
      setIsSaving(false);
      inputRef.current?.focus();
    }
  };

  const backButton = showBackButton && onCancel && (
    <button
      type="button"
      onClick={onCancel}
      disabled={isSaving}
      className={styles.backButton}
      aria-label="Cancel and go back"
    >
      <ArrowLeft size={20} aria-hidden />
    </button>
  );

  return (
    <div
      className={`${styles.container}${showBackButton ? "" : ` ${styles.containerFlush}`}`}
    >
      {backButton}
      <h2 className={styles.heading}>Enter your name to save your guess</h2>
      {supportingLine ? (
        <p className={styles.supporting}>{supportingLine}</p>
      ) : null}
      <form onSubmit={handleSubmit} className={styles.form}>
        <label htmlFor={nameId} className="sr-only">
          Your name
        </label>
        <input
          ref={inputRef}
          id={nameId}
          type="text"
          name="name"
          autoComplete="nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-black/40 bg-transparent p-2 text-black focus:outline-none focus:ring-2 focus:ring-black/30"
          required
          disabled={isSaving}
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={errorMessage ? errorId : undefined}
        />
        {errorMessage ? (
          <p id={errorId} role="alert" className={styles.error}>
            {errorMessage}
          </p>
        ) : null}
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
