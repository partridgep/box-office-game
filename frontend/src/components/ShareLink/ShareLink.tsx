import { useEffect, useId, useRef, useState } from "react";
import { Check, Copy, Share2, X } from "lucide-react";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useCopy } from "../Friends/friends";
import styles from "./ShareLink.module.css";

const iconButton =
  "inline-flex items-center gap-1.5 rounded-lg border border-stone-600/60 px-3 py-2 text-sm text-stone-200 hover:border-theater-gold/60 hover:text-theater-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold transition-colors";

export default function ShareLink({
  shareLink,
  onClose,
}: {
  shareLink: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const linkId = useId();
  const { copied, copy } = useCopy();
  const [announcement, setAnnouncement] = useState("");
  const canShare = typeof navigator.share === "function";

  useBodyScrollLock();

  useEffect(() => {
    dialogRef.current?.showModal();
    inputRef.current?.select();
  }, []);

  async function handleCopy() {
    const ok = await copy(shareLink, "link");
    setAnnouncement(
      ok
        ? "Link copied"
        : "Couldn't copy. Select the link and copy it manually."
    );
  }

  async function handleShare() {
    try {
      await navigator.share({
        title: "My box office guess",
        text: "Check out my prediction on Box Office Guesser.",
        url: shareLink,
      });
    } catch {
      // Dismissing the share sheet rejects; nothing to report.
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClose={onClose}
      className={`${styles.dialog} m-auto w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-theater-gold/25 bg-cinema-900 p-0 text-stone-100 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop:bg-cinema-950/80 backdrop:backdrop-blur-sm`}
    >
      <div className="p-6 space-y-6 text-left">
        <div className="flex items-start justify-between gap-4">
          <h2
            id={headingId}
            className="font-marquee text-3xl uppercase tracking-wide text-theater-gold"
          >
            Share your guess
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-lg p-2 text-stone-400 hover:text-stone-100 hover:bg-cinema-800 focus-visible:outline-2 focus-visible:outline-theater-gold"
            aria-label="Close"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div>
          <label htmlFor={linkId} className="sr-only">
            Share link
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={linkId}
              ref={inputRef}
              type="text"
              readOnly
              value={shareLink}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-stone-600/60 bg-cinema-950/60 px-3 py-2.5 text-sm text-stone-200 focus-visible:outline-2 focus-visible:outline-theater-gold"
            />
            <button type="button" onClick={handleCopy} className={iconButton}>
              {copied === "link" ? (
                <Check size={16} aria-hidden />
              ) : (
                <Copy size={16} aria-hidden />
              )}
              {copied === "link" ? "Copied" : "Copy"}
            </button>
            {canShare && (
              <button type="button" onClick={handleShare} className={iconButton}>
                <Share2 size={16} aria-hidden />
                Share
              </button>
            )}
          </div>
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </dialog>
  );
}
