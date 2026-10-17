/** Rubber-stamp confirmation; the slam-in animation is skipped under prefers-reduced-motion. */
export default function FollowStamp({ label = "Following", className = "" }: { label?: string; className?: string }) {
  return (
    <span className={`follow-stamp ${className}`} aria-hidden>
      {label}
    </span>
  );
}
