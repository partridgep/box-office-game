import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, X } from "lucide-react";
import { useUserStore } from "../../store/useUserStore";
import { loginUser } from "../../services/users.service";
import { persistUser } from "../../utils/userPersistence";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import styles from "./RecoverAccount.module.css";

const fieldClass =
  "w-full rounded-lg border border-stone-600/60 bg-cinema-950/60 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-theater-gold";
const primaryButton =
  "inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-theater-gold px-4 py-2.5 text-sm font-semibold text-cinema-950 hover:bg-theater-gold/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold";

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
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const nameId = useId();
  const keyId = useId();
  const errorId = useId();
  const messageId = useId();
  const supportId = useId();

  useBodyScrollLock();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleRecover = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);

    try {
      const response = await loginUser(name.trim(), accessKey.trim());

      const recoveredUser = {
        ...response.user,
        id: String(response.user.id),
        access_key: accessKey.trim(),
      };

      await persistUser(recoveredUser);
      setUser(recoveredUser);
      dialogRef.current?.close();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't restore access");
      setBusy(false);
    }
  };

  const describedBy = [
    supportId,
    message ? messageId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      aria-describedby={describedBy}
      onClose={onClose}
      className={`${styles.dialog} m-auto w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-theater-gold/25 bg-cinema-900 p-0 text-stone-100 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop:bg-cinema-950/80 backdrop:backdrop-blur-sm`}
    >
      <form onSubmit={handleRecover} className="p-6 space-y-6 text-left">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={headingId}
              className="font-marquee text-3xl uppercase tracking-wide text-theater-gold"
            >
              Restore Access
            </h2>
            <p id={supportId} className="text-sm text-stone-400 mt-1">
              Use the name and secret key from your first prediction.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={busy}
            className="rounded-lg p-2 text-stone-400 hover:text-stone-100 hover:bg-cinema-800 focus-visible:outline-2 focus-visible:outline-theater-gold disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        {message && (
          <p
            id={messageId}
            className="rounded-lg border border-theater-gold/35 bg-theater-gold/10 px-3 py-2.5 text-sm text-theater-gold leading-snug"
            role="status"
          >
            {message}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor={nameId}
              className="block text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 mb-2"
            >
              Name
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder="As on your ticket"
              required
              autoComplete="username"
              autoFocus
              disabled={busy}
              aria-invalid={Boolean(error)}
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor={keyId}
              className="block text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 mb-2"
            >
              Access key
            </label>
            <div className="relative">
              <input
                id={keyId}
                type={showKey ? "text" : "password"}
                value={accessKey}
                onChange={(e) => {
                  setAccessKey(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Secret key"
                required
                autoComplete="current-password"
                spellCheck={false}
                disabled={busy}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                className={`${fieldClass} font-mono tracking-wide pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                disabled={busy}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-stone-400 hover:text-stone-100 focus-visible:outline-2 focus-visible:outline-theater-gold disabled:opacity-50"
                aria-label={showKey ? "Hide access key" : "Show access key"}
                aria-pressed={showKey}
              >
                {showKey ? (
                  <EyeOff size={18} aria-hidden />
                ) : (
                  <Eye size={18} aria-hidden />
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p id={errorId} className="text-sm text-cinema-200" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={primaryButton} disabled={busy}>
          {busy ? (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          ) : (
            <KeyRound size={16} aria-hidden />
          )}
          {busy ? "Restoring…" : "Restore"}
        </button>
      </form>
    </dialog>
  );
}
