import { Guess } from "../../types";

interface SocialProofProps {
  allMovieGuesses: Guess[];
  /** When true, skip outer chrome (parent supplies frosted panel) */
  bare?: boolean;
}

export default function SocialProof({ allMovieGuesses, bare }: SocialProofProps) {
  const count = allMovieGuesses.length;

  const uniqueUsers = allMovieGuesses.reduce<Map<string, Guess["guess_user"]>>(
    (acc, g) => {
      if (g.guess_user) {
        acc.set(String(g.guess_user.id), g.guess_user);
      }
      return acc;
    },
    new Map()
  );

  const avatars = Array.from(uniqueUsers.values()).slice(0, 5);
  const overflow = uniqueUsers.size - avatars.length;

  const body =
    count === 0 ? (
      <p className="text-sm text-stone-400">
        Be the first to place a prediction on this title.
      </p>
    ) : (
      <>
        <p className="text-sm font-medium text-stone-200">
          {count} prediction{count !== 1 ? "s" : ""} placed
        </p>
        {avatars.length > 0 && (
          <div className="flex items-center mt-3 -space-x-2">
            {avatars.map((user) => (
              <div
                key={user!.id}
                className="w-8 h-8 rounded-full bg-cinema-600 border-2 border-cinema-900 flex items-center justify-center text-xs font-bold text-white"
                title={user!.name}
              >
                {user!.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {overflow > 0 && (
              <div className="w-8 h-8 rounded-full bg-cinema-800 border-2 border-cinema-900 flex items-center justify-center text-xs text-stone-400">
                +{overflow}
              </div>
            )}
          </div>
        )}
      </>
    );

  if (bare) {
    return <div className="p-4">{body}</div>;
  }

  return (
    <div className="rounded-xl border border-cinema-800 bg-cinema-900/30 p-4">
      {body}
    </div>
  );
}
