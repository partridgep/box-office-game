import { FriendPreview } from "../../services/users.service";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Who you're about to follow, so a typo'd code can't follow the wrong person. */
export default function PlayerPreview({
  player,
  tone = "dark",
}: {
  player: FriendPreview;
  tone?: "dark" | "ticket";
}) {
  const muted = tone === "ticket" ? "text-ticket-ink/70" : "text-stone-400";
  const stats = [
    plural(player.prediction_count, "prediction"),
    plural(player.followers_count, "follower"),
    player.friends_in_common > 0 && plural(player.friends_in_common, "friend") + " in common",
  ].filter(Boolean);

  return (
    <div className="text-left min-w-0">
      <p className="font-marquee text-2xl uppercase leading-tight truncate">{player.name}</p>
      <p className={`text-xs uppercase tracking-[0.2em] ${muted}`}>
        <span className="sr-only">Friend code </span>
        {player.short_id}
      </p>
      <ul className={`mt-1 flex flex-wrap gap-x-3 text-sm ${muted}`}>
        {stats.map((s) => (
          <li key={s as string}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
