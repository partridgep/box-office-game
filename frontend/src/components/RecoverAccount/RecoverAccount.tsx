import { useState, useEffect, useRef } from "react";
import { useUserStore } from "../../store/useUserStore";
import { loginUser } from "../../services/users.service";
import styles from './RecoverAccount.module.css';

export default function RecoverAccount({ onClose }: { onClose: () => void }) {
  const setUser = useUserStore((s) => s.setUser);

  const [name, setName] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
        const response = await loginUser(name, accessKey);

        console.log(response)

        // Store recovered user locally
        localStorage.setItem("user", JSON.stringify(response.user));

        setUser(response.user);
        setError("");
        dialogRef.current?.close();
        onClose();
    } catch (err: any) {
        setError(err.message || "Recovery failed");
    }
  };

  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  return (
    <dialog ref={dialogRef} className={styles['dialog']}>
        <form onSubmit={handleRecover} className={styles['form']}>
        <h2>Recover Your Account</h2>

        <div className={styles['inputs']}>
            <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
            />

            <input
                type="text"
                placeholder="Access key"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                required
            />
        </div>


        {error && <p className={styles['error-msg']}>{error}</p>}

        <div className={styles['buttons']}>
            <button
                type="button"
                onClick={handleClose}
            >
                Close
            </button>
            <button type="submit">
                Recover
            </button>
        </div>

        </form>
    </dialog>
  );
}
