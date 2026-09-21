import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useUserStore } from "../../store/useUserStore";
import styles from "./UserConfirmation.module.css";

export default function UserConfirmation({ onDone }: { onDone: () => void }) {
  const user = useUserStore((state) => state.user);
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  if (!user) return <p>Loading...</p>;

  const handleCopy = async () => {
    if (!user.access_key) return;
    try {
      await navigator.clipboard.writeText(user.access_key);
      setCopied(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard may be blocked; leave icon as Copy
    }
  };

  return (
    <div className={styles.receipt}>
      <div className={styles.body}>
        <p className={styles.eyebrow}>Admission confirmed</p>
        <h2 className={styles.heading}>Welcome, {user.name}!</h2>

        <div className={styles.field}>
          <span className={styles.label}>User ID</span>
          <span className={styles.ticketNumber}>{user.short_id}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Secret Access Key</span>
          <div className={styles.keyRow}>
            <span className={styles.key}>{user.access_key}</span>
            <button
              type="button"
              className={styles.copyButton}
              onClick={handleCopy}
              aria-label={copied ? "Copied" : "Copy access key"}
            >
              <span className={styles.copyIconStack} aria-hidden>
                <Copy
                  size={16}
                  strokeWidth={2.25}
                  className={`${styles.copyIconLayer} ${
                    copied ? styles.copyIconExit : styles.copyIconEnter
                  }`}
                />
                <Check
                  size={16}
                  strokeWidth={2.5}
                  className={`${styles.copyIconLayer} ${
                    copied ? styles.copyIconEnter : styles.copyIconExit
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        <p className={styles.note}>
          Save this key — you&apos;ll need it to recover your guesses.
          <span className={styles.noteAside}>
            e.g. a new device, or if this browser clears its data
          </span>
        </p>
      </div>

      <div className={styles.perforation} aria-hidden>
        <span className={styles.dots} />
      </div>

      <div className={styles.stub}>
        <button type="button" className={styles.button} onClick={onDone}>
          Continue to Guessing
        </button>
      </div>
    </div>
  );
}
