import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Loader2, QrCode, Search, Share2, X } from "lucide-react";
import { useUserStore } from "../../store/useUserStore";
import { useFriendsStore } from "../../store/useFriendsStore";
import { FriendPreview, getUserByCode } from "../../services/users.service";
import PlayerPreview from "./PlayerPreview";
import FollowStamp from "./FollowStamp";
import { friendlyFriendError, inviteLinkFor, useCopy } from "./friends";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

type Lookup =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "found"; player: FriendPreview; justFollowed?: boolean }
  | { state: "error"; message: string };

const sectionHeading = "text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 mb-2";
const iconButton =
  "inline-flex items-center gap-1.5 rounded-lg border border-stone-600/60 px-3 py-2 text-sm text-stone-200 hover:border-theater-gold/60 hover:text-theater-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold transition-colors";
const primaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-theater-gold px-4 py-2 text-sm font-semibold text-cinema-950 hover:bg-theater-gold/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold";

export default function FriendsDialog({ onClose }: { onClose: () => void }) {
  const user = useUserStore((s) => s.user);
  const { following, loaded, loadFollowing, follow, unfollow } = useFriendsStore();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const codeInputId = useId();
  const codeErrorId = useId();
  const qrId = useId();

  const { copied, copy } = useCopy();
  const [showQr, setShowQr] = useState(false);
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [listError, setListError] = useState("");
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useBodyScrollLock();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (!loaded) {
      loadFollowing().catch((err) => setListError(friendlyFriendError(err)));
    }
  }, [loaded, loadFollowing]);

  if (!user) return null;

  const inviteLink = inviteLinkFor(user.short_id);
  const canShare = typeof navigator.share === "function";

  async function handleCopy(text: string, key: string, what: string) {
    const ok = await copy(text, key);
    setAnnouncement(ok ? `${what} copied` : `Couldn't copy. Select the ${what.toLowerCase()} and copy it manually.`);
  }

  async function handleShare() {
    try {
      await navigator.share({
        title: "Follow me on BoxOfficeGuesser",
        text: `Follow ${user!.name} on BoxOfficeGuesser and compare box office predictions.`,
        url: inviteLink,
      });
    } catch {
      // Dismissing the share sheet rejects; nothing to report.
    }
  }

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setLookup({ state: "error", message: "Enter a friend code, like GUY417." });
      return;
    }
    setLookup({ state: "loading" });
    try {
      const player = await getUserByCode(trimmed);
      setLookup({ state: "found", player });
      setAnnouncement(`Found ${player.name}`);
    } catch (err) {
      const message = /no player/i.test(String(err))
        ? `No player with code ${trimmed.toUpperCase()}.`
        : friendlyFriendError(err);
      setLookup({ state: "error", message });
      setAnnouncement(message);
    }
  }

  async function handleFollow(player: FriendPreview) {
    setBusyCode(player.short_id);
    try {
      await follow(player.short_id);
      setLookup({
        state: "found",
        player: { ...player, is_following: true, followers_count: player.followers_count + 1 },
        justFollowed: true,
      });
      setAnnouncement(`Now following ${player.name}`);
    } catch (err) {
      const message = friendlyFriendError(err);
      setLookup({ state: "error", message });
      setAnnouncement(message);
    } finally {
      setBusyCode(null);
    }
  }

  async function handleUnfollow(name: string, short_id: string) {
    setBusyCode(short_id);
    try {
      await unfollow(short_id);
      setAnnouncement(`Unfollowed ${name}`);
      if (lookup.state === "found" && lookup.player.short_id === short_id) {
        setLookup({
          state: "found",
          player: {
            ...lookup.player,
            is_following: false,
            followers_count: Math.max(0, lookup.player.followers_count - 1),
          },
        });
      }
    } catch (err) {
      setListError(friendlyFriendError(err));
    } finally {
      setBusyCode(null);
    }
  }

  const found = lookup.state === "found" ? lookup : null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-theater-gold/25 bg-cinema-900 p-0 text-stone-100 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop:bg-cinema-950/80 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 space-y-7 text-left">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={headingId} className="font-marquee text-3xl uppercase tracking-wide text-theater-gold">
              Friends
            </h2>
            <p className="text-sm text-stone-400 mt-1">
              Follow players to see their predictions next to yours.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-lg p-2 text-stone-400 hover:text-stone-100 hover:bg-cinema-800 focus-visible:outline-2 focus-visible:outline-theater-gold"
            aria-label="Close friends"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <section aria-labelledby={`${headingId}-share`}>
          <h3 id={`${headingId}-share`} className={sectionHeading}>
            Share your friend code
          </h3>
          <div className="ticket-stub rounded-r px-5 py-4 text-ticket-ink">
            <div className="flex items-center justify-between gap-3">
              <p className="font-marquee text-4xl uppercase tracking-[0.15em] leading-none">
                <span className="sr-only">Your friend code: </span>
                {user.short_id}
              </p>
              <button
                type="button"
                onClick={() => handleCopy(user.short_id, "code", "Friend code")}
                className="inline-flex items-center gap-1.5 rounded-md border border-ticket-ink/40 px-3 py-1.5 text-sm font-medium hover:bg-ticket-ink/10 focus-visible:outline-2 focus-visible:outline-ticket-ink"
              >
                {copied === "code" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                {copied === "code" ? "Copied" : "Copy code"}
              </button>
            </div>
          </div>

          <label htmlFor={`${headingId}-link`} className="block text-sm text-stone-300 mt-4 mb-1">
            Invite link — anyone who opens it can follow you, and you'll follow them back.
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`${headingId}-link`}
              type="text"
              readOnly
              value={inviteLink}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-stone-600/60 bg-cinema-950/60 px-3 py-2 text-sm text-stone-200 focus-visible:outline-2 focus-visible:outline-theater-gold"
            />
            <button type="button" onClick={() => handleCopy(inviteLink, "link", "Invite link")} className={iconButton}>
              {copied === "link" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied === "link" ? "Copied" : "Copy"}
            </button>
            {canShare && (
              <button type="button" onClick={handleShare} className={iconButton}>
                <Share2 size={16} aria-hidden />
                Share
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowQr((on) => !on)}
              aria-expanded={showQr}
              aria-controls={qrId}
              className={iconButton}
            >
              <QrCode size={16} aria-hidden />
              {showQr ? "Hide QR" : "QR code"}
            </button>
          </div>
          {showQr && (
            <figure id={qrId} className="mt-4 flex flex-col items-center gap-2">
              <div className="rounded-xl bg-ticket p-4">
                <QRCodeSVG
                  value={inviteLink}
                  size={176}
                  bgColor="#d9a62e"
                  fgColor="#14110b"
                  level="M"
                  role="img"
                  aria-label={`QR code for ${user.name}'s invite link`}
                />
              </div>
              <figcaption className="text-xs text-stone-400">
                Scan to follow {user.name}.
              </figcaption>
            </figure>
          )}
        </section>

        <section aria-labelledby={`${headingId}-find`}>
          <h3 id={`${headingId}-find`} className={sectionHeading}>
            Follow by code
          </h3>
          <form onSubmit={handleLookup} className="flex gap-2" noValidate>
            <label htmlFor={codeInputId} className="sr-only">
              Friend code
            </label>
            <input
              id={codeInputId}
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (lookup.state !== "idle") setLookup({ state: "idle" });
              }}
              placeholder="e.g. SAM882"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={lookup.state === "error"}
              aria-describedby={lookup.state === "error" ? codeErrorId : undefined}
              className="min-w-0 flex-1 rounded-lg border border-stone-600/60 bg-cinema-950/60 px-3 py-2 font-marquee uppercase tracking-[0.15em] text-stone-100 placeholder:text-stone-500 placeholder:tracking-normal focus-visible:outline-2 focus-visible:outline-theater-gold"
            />
            <button type="submit" className={primaryButton} disabled={lookup.state === "loading"}>
              {lookup.state === "loading" ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                <Search size={16} aria-hidden />
              )}
              Find
            </button>
          </form>

          {lookup.state === "error" && (
            <p id={codeErrorId} className="mt-2 text-sm text-cinema-200">
              {lookup.message}
            </p>
          )}

          {found && (
            <div className="relative mt-3 flex items-center justify-between gap-4 rounded-xl border border-stone-700/60 bg-cinema-950/50 p-4">
              <PlayerPreview player={found.player} />
              {found.player.is_self ? (
                <p className="shrink-0 text-sm text-stone-400">That's you!</p>
              ) : found.player.is_following ? (
                found.justFollowed ? (
                  <FollowStamp className="shrink-0 text-theater-gold text-sm" />
                ) : (
                  <p className="shrink-0 text-sm text-theater-gold">Following</p>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => handleFollow(found.player)}
                  disabled={busyCode === found.player.short_id}
                  className={`${primaryButton} shrink-0`}
                >
                  {busyCode === found.player.short_id && <Loader2 size={16} className="animate-spin" aria-hidden />}
                  Follow
                </button>
              )}
            </div>
          )}
        </section>

        <section aria-labelledby={`${headingId}-following`}>
          <h3 id={`${headingId}-following`} className={sectionHeading}>
            Following{loaded ? ` (${following.length})` : ""}
          </h3>
          {listError ? (
            <p className="text-sm text-cinema-200">{listError}</p>
          ) : !loaded ? (
            <p className="text-sm text-stone-400 inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" aria-hidden /> Loading…
            </p>
          ) : following.length === 0 ? (
            <p className="text-sm text-stone-400">
              You're not following anyone yet. Share your code or enter a friend's above.
            </p>
          ) : (
            <ul className="divide-y divide-stone-800">
              {following.map((f) => (
                <li key={f.short_id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-stone-100">{f.name}</span>
                    <span className="block text-xs uppercase tracking-[0.2em] text-stone-500">{f.short_id}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUnfollow(f.name, f.short_id)}
                    disabled={busyCode === f.short_id}
                    aria-label={`Unfollow ${f.name}`}
                    className="text-xs text-stone-400 hover:text-cinema-200 rounded-md px-2 py-1 focus-visible:outline-2 focus-visible:outline-theater-gold disabled:opacity-50"
                  >
                    Unfollow
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </dialog>
  );
}
