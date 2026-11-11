/** Pixel-stepped arrow to match Ticketing’s bitmap look. */
export default function PixelBackArrow({
  width = 56,
  height = 30,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 28 28"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <rect x="12" y="1" width="2" height="1" />
      <rect x="11" y="2" width="3" height="1" />
      <rect x="10" y="3" width="4" height="1" />
      <rect x="9" y="4" width="5" height="1" />
      <rect x="8" y="5" width="6" height="1" />
      <rect x="7" y="6" width="7" height="1" />
      <rect x="6" y="7" width="8" height="1" />
      <rect x="5" y="8" width="9" height="1" />
      <rect x="4" y="9" width="10" height="1" />
      <rect x="3" y="10" width="11" height="1" />
      <rect x="2" y="11" width="12" height="1" />
      <rect x="1" y="12" width="13" height="1" />
      <rect x="0" y="13" width="14" height="2" />
      <rect x="1" y="15" width="13" height="1" />
      <rect x="2" y="16" width="12" height="1" />
      <rect x="3" y="17" width="11" height="1" />
      <rect x="4" y="18" width="10" height="1" />
      <rect x="5" y="19" width="9" height="1" />
      <rect x="6" y="20" width="8" height="1" />
      <rect x="7" y="21" width="7" height="1" />
      <rect x="8" y="22" width="6" height="1" />
      <rect x="9" y="23" width="5" height="1" />
      <rect x="10" y="24" width="4" height="1" />
      <rect x="11" y="25" width="3" height="1" />
      <rect x="12" y="26" width="2" height="1" />
      <rect x="14" y="10" width="14" height="8" />
    </svg>
  );
}
