import { Link } from "react-router-dom";
import { useGuessStore } from "../../store/useGuessStore";
import { useUserStore } from "../../store/useUserStore";
import { GuessesBoard, GuessesSkeleton } from "./GuessesBoard";

export default function Guesses() {
  const user = useUserStore((s) => s.user);
  const sessionStatus = useUserStore((s) => s.sessionStatus);
  const openRestoreAccess = useUserStore((s) => s.openRestoreAccess);
  const guesses = useGuessStore((s) => s.guesses);
  const guessesLoaded = useGuessStore((s) => s.loaded);

  const signedIn = sessionStatus === "ready" && Boolean(user);
  const guessesPending =
    sessionStatus === "booting" || (signedIn && !guessesLoaded);

  if (guessesPending) {
    return <GuessesSkeleton />;
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <h1 className="font-marquee text-4xl uppercase tracking-wide text-theater-gold">
          Guesses
        </h1>
        <p className="text-stone-400">
          Sign in to see your calls and score updates.
        </p>
        <button
          type="button"
          onClick={() => openRestoreAccess()}
          className="inline-flex items-center justify-center rounded-lg bg-theater-gold px-4 py-2 text-sm font-semibold text-cinema-950 hover:bg-theater-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold"
        >
          Restore Access
        </button>
      </div>
    );
  }

  return (
    <GuessesBoard
      title="Your Guesses"
      guesses={guesses}
      emptyContent={
        <p className="rounded-xl border border-theater-gold/20 bg-cinema-950/80 px-4 py-5 text-sm text-stone-400">
          No guesses yet.{" "}
          <Link
            to="/"
            className="text-theater-gold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-theater-gold"
          >
            Browse upcoming titles
          </Link>
          .
        </p>
      }
    />
  );
}
