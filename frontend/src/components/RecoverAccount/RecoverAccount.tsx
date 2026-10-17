import { useState, useEffect, useRef } from "react";
import { useUserStore } from "../../store/useUserStore";
import { loginUser } from "../../services/users.service";
// import { encryptText, saveEncrypted } from '../../utils/crypto/cryptoStorage';
import { persistUser } from "../../utils/userPersistence";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import styles from './RecoverAccount.module.css';

export default function RecoverAccount({
  onClose,
  message,
}: {
  onClose: () => void;
  /** e.g. session-expired copy when silent refresh failed */
  message?: string | null;
}) {
  const setUser = useUserStore((s) => s.setUser);

  const [name, setName] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const messageId = "recover-session-message";

  useBodyScrollLock();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await loginUser(name, accessKey);

      const recoveredUser = {
        ...response.user,
        id: String(response.user.id),
        access_key: accessKey,
      };

      await persistUser(recoveredUser);

      setUser(recoveredUser);

      setError("");
      dialogRef.current?.close();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Recovery failed");
    }
  };

  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles["dialog"]}
      aria-describedby={message ? messageId : undefined}
    >
      <form onSubmit={handleRecover} className={styles["form"]}>
        <h2>Recover Your Account</h2>

        {message && (
          <p id={messageId} className={styles["session-msg"]} role="status">
            {message}
          </p>
        )}

        <div className={styles["inputs"]}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="username"
          />

          <input
            type="text"
            placeholder="Access key"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            required
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {error && (
          <p className={styles["error-msg"]} role="alert">
            {error}
          </p>
        )}

        <div className={styles["buttons"]}>
          <button type="button" onClick={handleClose}>
            Close
          </button>
          <button type="submit">Recover</button>
        </div>
      </form>
    </dialog>
  );
}
