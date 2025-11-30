import { useUserStore } from '../../store/useUserStore';
import styles from './UserConfirmation.module.css';

export default function UserConfirmation({ onDone }: { onDone: () => void }) {
  const user = useUserStore((state) => state.user);

  if (!user) return <p>Loading...</p>;

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Welcome, {user.name}!</h2>
      <p> className={styles.text}Your user ID: {user.short_id}</p>
      <p className={`${styles.text} ${styles.key}`}><strong>Secret Access Key:</strong> {user.access_key}</p>
      <p className={styles.note}>Save this key! You'll need it to recover your guesses.</p>

      <button
        className={styles.button}
        onClick={onDone}
      >
        Continue to Guessing
      </button>
    </div>
  );
}

