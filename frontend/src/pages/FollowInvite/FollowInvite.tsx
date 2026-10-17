import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useUserStore } from "../../store/useUserStore";
import { useFriendsStore } from "../../store/useFriendsStore";
import { FriendPreview, getUserByCode } from "../../services/users.service";
import TicketStub from "../../components/TicketStub/TicketStub";
import PlayerPreview from "../../components/Friends/PlayerPreview";
import FollowStamp from "../../components/Friends/FollowStamp";
import { friendlyFriendError, inviteLinkFor, useCopy } from "../../components/Friends/friends";
import UserSignup from "../../components/UserSignup/UserSignupPrompt";
import UserConfirmation from "../../components/UserSignup/UserConfirmation";
import RecoverAccount from "../../components/RecoverAccount/RecoverAccount";

type Step = "invite" | "signup" | "confirmSignup";

const ticketButton =
  "inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-wider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ticket-ink disabled:opacity-60";

export default function FollowInvite() {
  const { code = "" } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const follow = useFriendsStore((s) => s.follow);
  const { copied, copy } = useCopy();

  const [player, setPlayer] = useState<FriendPreview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState<Step>("invite");
  const [showRecover, setShowRecover] = useState(false);
  const [following, setFollowing] = useState(false);
  const [justFollowed, setJustFollowed] = useState(false);
  const [followError, setFollowError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Refetch after login/signup: whether this is your own code or someone you already follow depends on the viewer.
  useEffect(() => {
    let cancelled = false;
    setLoadError("");
    getUserByCode(code)
      .then((p) => {
        if (!cancelled) setPlayer(p);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          /no player/i.test(String(err))
            ? `No player has the code ${code.toUpperCase()}. Double-check the link with whoever sent it.`
            : friendlyFriendError(err)
        );
      });
    return () => {
      cancelled = true;
    };
  }, [code, user?.id]);

  useEffect(() => {
    document.title = player ? `Follow ${player.name} · BoxOfficeGuesser` : "Friend invite · BoxOfficeGuesser";
  }, [player]);

  const hasPlayer = Boolean(player);
  useEffect(() => {
    if (step === "invite") headingRef.current?.focus();
  }, [step, justFollowed, hasPlayer]);

  async function handleFollow() {
    if (!player) return;
    setFollowing(true);
    setFollowError("");
    try {
      await follow(player.short_id, true);
      setPlayer({ ...player, is_following: true, followers_count: player.followers_count + 1 });
      setJustFollowed(true);
    } catch (err) {
      setFollowError(friendlyFriendError(err));
    } finally {
      setFollowing(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md pt-16 text-center space-y-4">
        <h1 className="font-marquee text-3xl uppercase text-theater-gold">Invite not found</h1>
        <p className="text-stone-300">{loadError}</p>
        <Link to="/" className="inline-block text-theater-gold underline underline-offset-4">
          Back to the lobby
        </Link>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex justify-center items-center h-[60vh]" role="status">
        <Loader2 className="animate-spin text-cinema-400" size={48} aria-hidden />
        <span className="sr-only">Loading invite…</span>
      </div>
    );
  }

  if (step === "signup") {
    return (
      <div className="mx-auto max-w-md pt-12">
        <TicketStub className="rounded-r">
          <UserSignup onSignup={() => setStep("confirmSignup")} onCancel={() => setStep("invite")} />
        </TicketStub>
      </div>
    );
  }

  if (step === "confirmSignup") {
    return (
      <div className="mx-auto max-w-md pt-12">
        <UserConfirmation onDone={() => setStep("invite")} />
      </div>
    );
  }

  const isFollowing = player.is_following;

  return (
    <div className="mx-auto max-w-md pt-12">
      <TicketStub footer={`ADMIT ONE · FRIEND PASS · ${player.short_id}`} className="rounded-r">
        <p className="text-left text-xs uppercase tracking-[0.25em] text-ticket-ink/70">Friend invite</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-1 text-left text-2xl uppercase leading-tight focus:outline-none"
        >
          {player.is_self
            ? "This is your invite link"
            : isFollowing
              ? `You're following ${player.name}`
              : `${player.name} invited you to their screening party`}
        </h1>

        <div className="relative mt-5 border-y border-dashed border-ticket-ink/40 py-4">
          <PlayerPreview player={player} tone="ticket" />
          {justFollowed && (
            <FollowStamp className="absolute right-0 top-1/2 -translate-y-1/2 text-ticket-ink text-lg" />
          )}
        </div>

        <div className="mt-5 text-left">
          {player.is_self ? (
            <>
              <p className="text-sm font-[Outfit,sans-serif] text-ticket-ink/80 mb-3">
                Send it to friends — when they open it, you'll follow each other.
              </p>
              <button
                type="button"
                onClick={() => copy(inviteLinkFor(player.short_id), "link")}
                className={`${ticketButton} bg-ticket-ink text-ticket`}
              >
                {copied === "link" ? "Copied!" : "Copy invite link"}
              </button>
            </>
          ) : isFollowing ? (
            <>
              <p className="text-sm font-[Outfit,sans-serif] text-ticket-ink/80 mb-3">
                {justFollowed
                  ? `You and ${player.name} now follow each other. Their predictions will show up next to yours.`
                  : `${player.name}'s predictions already show up next to yours.`}
              </p>
              <button
                type="button"
                onClick={() => navigate("/")}
                className={`${ticketButton} bg-ticket-ink text-ticket`}
              >
                Find a movie to predict
              </button>
            </>
          ) : user ? (
            <>
              <p className="text-sm font-[Outfit,sans-serif] text-ticket-ink/80 mb-3">
                Follow {player.name} to compare predictions on every movie you both call. They'll follow you back.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={following}
                  className={`${ticketButton} bg-ticket-ink text-ticket`}
                >
                  {following && <Loader2 size={16} className="animate-spin" aria-hidden />}
                  Follow {player.name}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className={`${ticketButton} border border-ticket-ink/50`}
                >
                  Not now
                </button>
              </div>
              {followError && (
                <p role="alert" className="mt-3 text-sm font-[Outfit,sans-serif] font-semibold">
                  {followError}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-[Outfit,sans-serif] text-ticket-ink/80 mb-3">
                Grab a ticket to follow {player.name}. It takes one name — no email or password.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep("signup")}
                  className={`${ticketButton} bg-ticket-ink text-ticket`}
                >
                  Get a ticket
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecover(true)}
                  className={`${ticketButton} border border-ticket-ink/50`}
                >
                  I have an access key
                </button>
              </div>
            </>
          )}
        </div>
      </TicketStub>

      <p role="status" aria-live="polite" className="sr-only">
        {justFollowed ? `Now following ${player.name}` : ""}
      </p>

      {showRecover && <RecoverAccount onClose={() => setShowRecover(false)} />}
    </div>
  );
}
