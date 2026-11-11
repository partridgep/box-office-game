import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { useUserStore } from "../../store/useUserStore";
import { prefersReducedMotion } from "../../utils/viewTransitions";
import styles from "./UserConfirmation.module.css";

/** Tear-off beat after a successful continue (guest lock-in handoff). */
const TEAR_MS = 420;

export default function UserConfirmation({
  onDone,
  onFinished,
  continueLabel = "Continue",
  continueBusyLabel = "Working...",
  tearOnContinue = false,
}: {
  /** Submit / side effects. Throw to keep the receipt and show an error. */
  onDone: () => void | Promise<void>;
  /** After success (and optional stub tear). Use for navigation / phase change. */
  onFinished?: () => void;
  continueLabel?: string;
  continueBusyLabel?: string;
  /** Detach the CTA stub along the perforation before finishing. */
  tearOnContinue?: boolean;
}) {
  const user = useUserStore((state) => state.user);
  const [copied, setCopied] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [tearing, setTearing] = useState(false);
  const [continueError, setContinueError] = useState<string | null>(null);
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

  const handleContinue = async () => {
    if (isContinuing || tearing) return;
    setIsContinuing(true);
    setContinueError(null);
    try {
      await onDone();
      if (tearOnContinue && !prefersReducedMotion()) {
        setTearing(true);
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, TEAR_MS);
        });
      }
      onFinished?.();
    } catch {
      setContinueError("Couldn’t lock in your prediction. Try again.");
      setIsContinuing(false);
      setTearing(false);
    }
  };

  return (
    <div
      className={`${styles.receipt} guest-receipt-enter`}
      data-tearing={tearing ? "" : undefined}
    >
      {/* Remaining ticket: flat/notched bottom with dots as the torn edge. */}
      <div className={styles.ticket}>
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
                disabled={isContinuing || tearing}
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
      </div>

      {/* Outside the masked ticket so dots aren’t clipped — centered on the tear seam. */}
      <div className={styles.seam} aria-hidden>
        <span className={styles.dots} />
      </div>

      <div className={styles.stub}>
        {continueError ? (
          <p role="alert" className={styles.continueError}>
            {continueError}
          </p>
        ) : null}
        <button
          type="button"
          className={styles.button}
          onClick={handleContinue}
          disabled={isContinuing || tearing}
        >
          {isContinuing && !tearing ? (
            <>
              <Loader2 className={styles.spinner} size={16} aria-hidden />
              {continueBusyLabel}
            </>
          ) : (
            continueLabel
          )}
        </button>
      </div>
    </div>
  );
}
