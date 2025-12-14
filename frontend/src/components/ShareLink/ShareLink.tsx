import { useState, useEffect, useRef } from "react";
import styles from './ShareLink.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard } from '@fortawesome/free-solid-svg-icons';
import { library, IconProp } from '@fortawesome/fontawesome-svg-core';

library.add({ faClipboard });

 // @ts-ignore
const clipboardIcon : IconProp = "fa-solid fa-clipboard"

export default function ShareLink({ shareLink, onClose }: { shareLink: string, onClose: () => void }) {

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [justCopied, setJustCopied] = useState(false);


  useEffect(() => {
    dialogRef.current?.showModal();
    inputRef.current?.select();
  }, []);

  function handleLinkCopy(e: React.FormEvent) {
    e.preventDefault()
    navigator.clipboard.writeText(shareLink);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1000);
  }


  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  return (
    <dialog ref={dialogRef} className={styles['dialog']}>
        <form className={styles['form']}>
        <h2>Invite a friend to compete in your predictions</h2>

        <div className={styles['copy-link']}>
            <label htmlFor="share-link" className="sr-only">
                Share link
            </label>
            <input
                type="text"
                id="share-link"
                ref={inputRef}
                value={shareLink}
                readOnly
                onFocus={(e) => e.target.select()}
            />
            <button
                className={styles['copy-button']}
                onClick={handleLinkCopy}
            >
                { justCopied
                    ? <p>Copied!</p>
                    : <FontAwesomeIcon icon={clipboardIcon} size="xl" />
                }
            </button>

        </div>

        <div className={styles['buttons']}>
            <button
                type="button"
                onClick={handleClose}
            >
                Close
            </button>
        </div>

        </form>
    </dialog>
  );
}
