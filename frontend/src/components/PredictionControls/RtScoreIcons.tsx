/** Pixel Fresh tomato / Rotten splat icons (crispEdges bitmap style). */

type IconProps = {
  className?: string;
  title?: string;
};

export function FreshTomatoIcon({ className, title }: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      className={className}
      shapeRendering="crispEdges"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {/* Stem */}
      <rect x="7" y="1" width="2" height="2" fill="#2f6b28" />
      <rect x="5" y="2" width="2" height="1" fill="#3d8b37" />
      <rect x="9" y="2" width="2" height="1" fill="#3d8b37" />
      {/* Body */}
      <rect x="4" y="4" width="8" height="1" fill="#c62828" />
      <rect x="3" y="5" width="10" height="1" fill="#e53935" />
      <rect x="2" y="6" width="12" height="1" fill="#e53935" />
      <rect x="2" y="7" width="12" height="1" fill="#e53935" />
      <rect x="2" y="8" width="12" height="1" fill="#d32f2f" />
      <rect x="2" y="9" width="12" height="1" fill="#d32f2f" />
      <rect x="3" y="10" width="10" height="1" fill="#c62828" />
      <rect x="4" y="11" width="8" height="1" fill="#b71c1c" />
      <rect x="5" y="12" width="6" height="1" fill="#b71c1c" />
      {/* Highlight */}
      <rect x="4" y="6" width="2" height="1" fill="#ff8a80" />
      <rect x="5" y="7" width="1" height="1" fill="#ff8a80" />
    </svg>
  );
}

export function RottenSplatIcon({ className, title }: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      className={className}
      shapeRendering="crispEdges"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {/* Irregular green splat */}
      <rect x="6" y="2" width="3" height="1" fill="#5cb85c" />
      <rect x="4" y="3" width="7" height="1" fill="#4caf50" />
      <rect x="3" y="4" width="9" height="1" fill="#4caf50" />
      <rect x="2" y="5" width="11" height="1" fill="#43a047" />
      <rect x="1" y="6" width="13" height="1" fill="#43a047" />
      <rect x="2" y="7" width="12" height="1" fill="#388e3c" />
      <rect x="3" y="8" width="10" height="1" fill="#388e3c" />
      <rect x="2" y="9" width="9" height="1" fill="#2e7d32" />
      <rect x="4" y="10" width="7" height="1" fill="#2e7d32" />
      <rect x="5" y="11" width="4" height="1" fill="#1b5e20" />
      {/* Drips / blobs */}
      <rect x="1" y="4" width="1" height="1" fill="#66bb6a" />
      <rect x="13" y="5" width="2" height="1" fill="#66bb6a" />
      <rect x="14" y="6" width="1" height="2" fill="#4caf50" />
      <rect x="0" y="7" width="1" height="2" fill="#66bb6a" />
      <rect x="11" y="11" width="2" height="1" fill="#43a047" />
      <rect x="12" y="12" width="1" height="1" fill="#2e7d32" />
      <rect x="3" y="12" width="2" height="1" fill="#43a047" />
      {/* Darker center for depth */}
      <rect x="6" y="6" width="3" height="2" fill="#1b5e20" />
    </svg>
  );
}
