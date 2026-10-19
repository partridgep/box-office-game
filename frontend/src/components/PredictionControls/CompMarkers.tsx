import {
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
} from "react";

export interface CompMarker {
  id?: string;
  /** CompMovie.id — matches star/hide prefs across metric fields. */
  compMovieId?: string;
  /** Short label shown under the tick (movie acronym). */
  label: string;
  /** Full title for tooltips when different from label. */
  title?: string;
  value: number;
  /** User-prioritized — always labeled, stronger tick, broken out of clusters. */
  starred?: boolean;
}

type PositionedMarker = CompMarker & { pos: number };

export type LabelSide = "center" | "left" | "right";

/**
 * One entry per visible control. Singles/pairs keep one control per marker;
 * bands of 3 use a vertical staircase; unstarred 4+ collapse to a cluster list.
 */
export type MarkerLayout = {
  marker: PositionedMarker;
  /** False for non-leaders in a staircase (tick is shared visually). */
  showTick: boolean;
  side: LabelSide;
  /** L-shaped tick arm when a pair is extremely close */
  corner: boolean;
  /**
   * When set (length >= COMP_CLUSTER_MIN), this control is a cluster: one tick,
   * compact label, and a popover listing every member.
   */
  clusterMembers?: PositionedMarker[];
  /** Vertical stack index within a 3-comp staircase (0 = under tick). */
  stackIndex?: number;
  /** Stair size; set for staircase bands (typically 3). */
  stackSize?: number;
};

/** @deprecated Use MarkerLayout — kept as an alias for any external imports. */
export type LayoutItem = MarkerLayout;

/** Percent of track width — labels are ~60px, so ~10% on a typical slider. */
export const COMP_BAND_THRESHOLD = 10;

/**
 * Max span (last − first pos) for one band. Without this, single-linkage
 * chaining pulls distant comps into one mega-cluster ($5M…$45M).
 */
export const COMP_BAND_MAX_SPAN = 12;

/** Below this gap, pairs get an L-arm so labels can fan farther out. */
export const COMP_CORNER_THRESHOLD = 4;

/** Bands this size use a labeled vertical staircase (not a list). */
export const COMP_STAIRCASE_SIZE = 3;

/** Unstarred bands at or above this become a +N cluster popover. */
export const COMP_CLUSTER_MIN = 4;

/**
 * Density (ticks-only) is a last resort — fan / stair / cluster / collision
 * handle normal crowding. Requires both: more markers than this, and at least
 * one band/cluster at or above COMP_DENSITY_BAND_MIN.
 */
export const COMP_DENSITY_MARKER_THRESHOLD = 14;

/** Minimum band/cluster size to allow density mode (extreme pile-ups only). */
export const COMP_DENSITY_BAND_MIN = 8;

/** Cap used when estimating acronym width for collision (matches max-w-[68px]). */
const LABEL_MAX_WIDTH_PX = 68;

/** Horizontal padding on the acronym hit target (px-1.5 × 2). */
const LABEL_PAD_PX = 12;

/** Horizontal L-arm length — identical on left and right. */
const CORNER_ARM_PX = 12;

/** Extra gap past the L-arm before the acronym starts. */
const CORNER_LABEL_GAP_PX = 2;

/** Extra gap (track %) so labels don’t kiss. */
const LABEL_COLLISION_PAD_PCT = 1.5;

/** Largest band represented in the layout (cluster, stair, or 1). */
export function maxBandSizeFromItems(items: MarkerLayout[]): number {
  let max = 1;
  for (const item of items) {
    max = Math.max(
      max,
      item.clusterMembers?.length ?? 0,
      item.stackSize ?? 1,
    );
  }
  return max;
}

/** True when the slider should use ticks-only density mode. */
export function shouldUseDensityMode(
  markerCount: number,
  items: MarkerLayout[],
  markerThreshold = COMP_DENSITY_MARKER_THRESHOLD,
  bandMin = COMP_DENSITY_BAND_MIN,
): boolean {
  return markerCount > markerThreshold && maxBandSizeFromItems(items) >= bandMin;
}

function bandSpan(band: PositionedMarker[]): number {
  if (band.length <= 1) return 0;
  return band[band.length - 1].pos - band[0].pos;
}

/**
 * Split a single-linkage band whose span exceeds `maxSpan` at the largest
 * internal gap (ties → closest to the midpoint) so chains don’t span the track.
 */
export function splitBandByMaxSpan(
  band: PositionedMarker[],
  maxSpan = COMP_BAND_MAX_SPAN,
): PositionedMarker[][] {
  if (band.length <= 1 || bandSpan(band) <= maxSpan) return [band];

  let splitAfter = 0;
  let bestGap = -1;
  let bestMidDist = Number.POSITIVE_INFINITY;
  const mid = (band.length - 1) / 2;

  for (let i = 0; i < band.length - 1; i++) {
    const gap = band[i + 1].pos - band[i].pos;
    const midDist = Math.abs(i + 0.5 - mid);
    if (
      gap > bestGap + 1e-9 ||
      (Math.abs(gap - bestGap) <= 1e-9 && midDist < bestMidDist)
    ) {
      bestGap = gap;
      splitAfter = i;
      bestMidDist = midDist;
    }
  }

  // Degenerate (all same pos but span reported high) — hard-split at middle.
  if (bestGap <= 0) {
    splitAfter = Math.floor((band.length - 1) / 2);
  }

  const left = band.slice(0, splitAfter + 1);
  const right = band.slice(splitAfter + 1);
  if (left.length === 0 || right.length === 0) {
    const midIdx = Math.floor(band.length / 2);
    return [
      ...splitBandByMaxSpan(band.slice(0, midIdx), maxSpan),
      ...splitBandByMaxSpan(band.slice(midIdx), maxSpan),
    ];
  }

  return [
    ...splitBandByMaxSpan(left, maxSpan),
    ...splitBandByMaxSpan(right, maxSpan),
  ];
}

/**
 * Layout each marker with its own position. Nearby markers share presentation:
 * pairs fan; 3 → labeled staircase; unstarred 4+ → cluster list. Starred comps
 * are pulled out of unstarred clusters (1 solo / 2 fan / 3+ staircase).
 * Adjacency chains are split when their span exceeds `maxSpan`.
 */
export function layoutCompMarkers(
  markers: CompMarker[],
  getPos: (value: number) => number,
  bandThreshold = COMP_BAND_THRESHOLD,
  cornerThreshold = COMP_CORNER_THRESHOLD,
  maxSpan = COMP_BAND_MAX_SPAN,
): MarkerLayout[] {
  if (markers.length === 0) return [];

  const positioned = markers
    .map((m) => ({ ...m, pos: getPos(m.value) }))
    .sort((a, b) => a.pos - b.pos || a.label.localeCompare(b.label));

  // Pass 1: single-linkage by adjacent gap.
  const rawBands: PositionedMarker[][] = [];
  let current: PositionedMarker[] = [positioned[0]];

  for (let i = 1; i < positioned.length; i++) {
    const prev = current[current.length - 1];
    if (positioned[i].pos - prev.pos <= bandThreshold) {
      current.push(positioned[i]);
    } else {
      rawBands.push(current);
      current = [positioned[i]];
    }
  }
  rawBands.push(current);

  // Pass 2: break transitive mega-bands that stretch too far.
  const bands = rawBands.flatMap((band) => splitBandByMaxSpan(band, maxSpan));

  const items: MarkerLayout[] = [];

  const pushPairOrSolo = (band: PositionedMarker[]) => {
    if (band.length === 0) return;
    if (band.length === 2) {
      const gap = band[1].pos - band[0].pos;
      const corner = gap <= cornerThreshold;
      items.push({
        marker: band[0],
        showTick: true,
        side: "left",
        corner,
      });
      items.push({
        marker: band[1],
        showTick: true,
        side: "right",
        corner,
      });
      return;
    }
    items.push({
      marker: band[0],
      showTick: true,
      side: "center",
      corner: false,
    });
  };

  /** Labeled vertical staircase — shared x so long acronyms don’t overlap sideways. */
  const pushStaircase = (band: PositionedMarker[]) => {
    const avgPos =
      band.reduce((sum, m) => sum + m.pos, 0) / band.length;
    for (let i = 0; i < band.length; i++) {
      items.push({
        marker: { ...band[i], pos: avgPos },
        showTick: i === 0,
        side: "center",
        corner: false,
        stackIndex: i,
        stackSize: band.length,
      });
    }
  };

  /** Unstarred: 1–2 fan/solo; 3 staircase; 4+ cluster list. */
  const pushUnstarredBand = (band: PositionedMarker[]) => {
    if (band.length === 0) return;
    if (band.length >= COMP_CLUSTER_MIN) {
      const avgPos =
        band.reduce((sum, m) => sum + m.pos, 0) / band.length;
      items.push({
        marker: { ...band[0], pos: avgPos },
        showTick: true,
        side: "center",
        corner: false,
        clusterMembers: band,
      });
      return;
    }
    if (band.length >= COMP_STAIRCASE_SIZE) {
      pushStaircase(band);
      return;
    }
    pushPairOrSolo(band);
  };

  /**
   * Starred: stay labeled & emphasized — 1 solo, 2 fan, 3+ staircase
   * (bounded by STARRED_COMPS_MAX so this stays readable).
   */
  const pushStarredBand = (band: PositionedMarker[]) => {
    if (band.length === 0) return;
    if (band.length >= COMP_STAIRCASE_SIZE) {
      pushStaircase(band);
      return;
    }
    pushPairOrSolo(band);
  };

  for (const band of bands) {
    const starred = band.filter((m) => m.starred);
    const rest = band.filter((m) => !m.starred);
    pushUnstarredBand(rest);
    pushStarredBand(starred);
  }
  return items;
}

/** Estimate acronym width as % of track (9px font + hit padding). */
export function estimateLabelWidthPct(
  label: string,
  trackWidthPx: number,
): number {
  const glyphPx = Math.min(
    LABEL_MAX_WIDTH_PX,
    Math.max(20, label.length * 6),
  );
  const px = glyphPx + LABEL_PAD_PX;
  return (px / Math.max(trackWidthPx, 1)) * 100;
}

function pxToTrackPct(px: number, trackWidthPx: number): number {
  return (px / Math.max(trackWidthPx, 1)) * 100;
}

function centeredLabelBounds(
  pos: number,
  label: string,
  trackWidthPx: number,
): { left: number; right: number } {
  const w = estimateLabelWidthPct(label, trackWidthPx);
  return { left: pos - w / 2, right: pos + w / 2 };
}

/**
 * Where the acronym actually paints after left/right fan + L-arm offset.
 * Staircases / clusters sit centered on their shared tick.
 */
export function placedLabelBounds(
  item: MarkerLayout,
  trackWidthPx: number,
): { left: number; right: number } {
  const { marker, side, corner, clusterMembers, stackSize = 1 } = item;
  const isCluster = (clusterMembers?.length ?? 0) >= COMP_CLUSTER_MIN;
  const label = isCluster
    ? `${marker.label} +${clusterMembers!.length - 1}`
    : marker.label;
  const w = estimateLabelWidthPct(label, trackWidthPx);
  const armPct = pxToTrackPct(CORNER_ARM_PX + CORNER_LABEL_GAP_PX, trackWidthPx);
  const pos = marker.pos;

  if (isCluster || stackSize >= COMP_STAIRCASE_SIZE || side === "center") {
    return { left: pos - w / 2, right: pos + w / 2 };
  }

  if (side === "left") {
    if (corner) {
      const right = pos - armPct;
      return { left: right - w, right };
    }
    // -translate-x-[calc(100%-12px)] → right edge near tick, body to the left.
    return {
      left: pos - w + pxToTrackPct(12, trackWidthPx),
      right: pos,
    };
  }

  // side === "right"
  if (corner) {
    const left = pos + armPct;
    return { left, right: left + w };
  }
  // -translate-x-1.5 → label starts a few px left of tick
  const left = pos - pxToTrackPct(6, trackWidthPx);
  return { left, right: left + w };
}

function markerIdentity(m: PositionedMarker): string {
  return m.id ?? `${m.label}-${m.value}-${m.pos}`;
}

/** Single-linkage bands from an arbitrary left/right bounds getter. */
function bandByBounds(
  markers: PositionedMarker[],
  boundsOf: (m: PositionedMarker) => { left: number; right: number },
): PositionedMarker[][] {
  if (markers.length === 0) return [];
  const sorted = [...markers].sort(
    (a, b) => a.pos - b.pos || a.label.localeCompare(b.label),
  );
  const bands: PositionedMarker[][] = [];
  let current: PositionedMarker[] = [sorted[0]];
  let bandRight = boundsOf(sorted[0]).right;

  for (let i = 1; i < sorted.length; i++) {
    const m = sorted[i];
    const bounds = boundsOf(m);
    if (bounds.left < bandRight + LABEL_COLLISION_PAD_PCT) {
      current.push(m);
      bandRight = Math.max(bandRight, bounds.right);
    } else {
      bands.push(current);
      current = [m];
      bandRight = bounds.right;
    }
  }
  bands.push(current);
  return bands;
}

function layoutOverlapBands(
  bands: PositionedMarker[][],
  priorClusters: MarkerLayout[] = [],
): MarkerLayout[] {
  const resolved: MarkerLayout[] = [...priorClusters];

  for (const band of bands) {
    if (band.length === 1) {
      resolved.push({
        marker: band[0],
        showTick: true,
        side: "center",
        corner: false,
      });
      continue;
    }

    if (band.length === 2) {
      // Collision pairs always get L-arms so labels seat past the arm tips.
      resolved.push({
        marker: band[0],
        showTick: true,
        side: "left",
        corner: true,
      });
      resolved.push({
        marker: band[1],
        showTick: true,
        side: "right",
        corner: true,
      });
      continue;
    }

    const allStarred = band.every((m) => m.starred);
    if (!allStarred && band.length >= COMP_CLUSTER_MIN) {
      const avgPos =
        band.reduce((sum, m) => sum + m.pos, 0) / band.length;
      resolved.push({
        marker: { ...band[0], pos: avgPos },
        showTick: true,
        side: "center",
        corner: false,
        clusterMembers: band,
      });
      continue;
    }

    const avgPos =
      band.reduce((sum, m) => sum + m.pos, 0) / band.length;
    for (let i = 0; i < band.length; i++) {
      resolved.push({
        marker: { ...band[i], pos: avgPos },
        showTick: i === 0,
        side: "center",
        corner: false,
        stackIndex: i,
        stackSize: band.length,
      });
    }
  }

  return resolved.sort(
    (a, b) =>
      a.marker.pos - b.marker.pos ||
      a.marker.label.localeCompare(b.marker.label),
  );
}

/**
 * True when two layout items’ painted labels overlap horizontally.
 * Items in the same staircase share an x and stack vertically — skip those.
 */
function placedLabelsOverlap(
  a: MarkerLayout,
  b: MarkerLayout,
  trackWidthPx: number,
): boolean {
  const aStairs = (a.stackSize ?? 1) >= COMP_STAIRCASE_SIZE;
  const bStairs = (b.stackSize ?? 1) >= COMP_STAIRCASE_SIZE;
  if (
    aStairs &&
    bStairs &&
    Math.abs(a.marker.pos - b.marker.pos) < 1e-6
  ) {
    return false;
  }

  const ab = placedLabelBounds(a, trackWidthPx);
  const bb = placedLabelBounds(b, trackWidthPx);
  return (
    ab.left < bb.right + LABEL_COLLISION_PAD_PCT &&
    bb.left < ab.right + LABEL_COLLISION_PAD_PCT
  );
}

/** Atomic presentation groups (solo / fan pair / staircase) for merge passes. */
type LayoutUnit = {
  items: MarkerLayout[];
  markers: PositionedMarker[];
};

/**
 * Group layout items into units so a fan pair or staircase merges as a whole
 * when any of its labels collide with a neighbor.
 */
function layoutUnits(items: MarkerLayout[]): LayoutUnit[] {
  const labeled = items.filter(
    (item) => (item.clusterMembers?.length ?? 0) < COMP_CLUSTER_MIN,
  );
  const sorted = [...labeled].sort(
    (a, b) =>
      a.marker.pos - b.marker.pos ||
      (a.stackIndex ?? 0) - (b.stackIndex ?? 0) ||
      a.marker.label.localeCompare(b.marker.label),
  );
  const units: LayoutUnit[] = [];
  let i = 0;
  while (i < sorted.length) {
    const item = sorted[i];
    const stackSize = item.stackSize ?? 1;

    if (stackSize >= COMP_STAIRCASE_SIZE) {
      const stair: MarkerLayout[] = [];
      while (
        i < sorted.length &&
        (sorted[i].stackSize ?? 1) >= COMP_STAIRCASE_SIZE &&
        Math.abs(sorted[i].marker.pos - item.marker.pos) < 1e-6
      ) {
        stair.push(sorted[i]);
        i++;
      }
      units.push({
        items: stair,
        markers: stair.map((s) => s.marker),
      });
      continue;
    }

    const next = sorted[i + 1];
    if (
      item.corner &&
      item.side === "left" &&
      next &&
      next.corner &&
      next.side === "right" &&
      (next.stackSize ?? 1) < COMP_STAIRCASE_SIZE
    ) {
      units.push({
        items: [item, next],
        markers: [item.marker, next.marker],
      });
      i += 2;
      continue;
    }

    units.push({ items: [item], markers: [item.marker] });
    i++;
  }
  return units;
}

function unitsOverlap(
  a: LayoutUnit,
  b: LayoutUnit,
  trackWidthPx: number,
): boolean {
  for (const ai of a.items) {
    for (const bi of b.items) {
      if (placedLabelsOverlap(ai, bi, trackWidthPx)) return true;
    }
  }
  return false;
}

/**
 * Re-band labeled markers by estimated glyph overlap (not just value proximity).
 * Pass 1: centered bounds → fan / stair / cluster.
 * Pass 2+: if fanned labels still collide (common with two adjacent pairs),
 * merge those presentation units and escalate (stair or cluster).
 */
export function resolveLabelCollisions(
  items: MarkerLayout[],
  trackWidthPx: number,
): MarkerLayout[] {
  if (items.length <= 1 || trackWidthPx <= 0) return items;

  const seedClusters = items.filter(
    (item) => (item.clusterMembers?.length ?? 0) >= COMP_CLUSTER_MIN,
  );
  const labeled = items.filter(
    (item) => (item.clusterMembers?.length ?? 0) < COMP_CLUSTER_MIN,
  );
  if (labeled.length <= 1) return items;

  let resolved = layoutOverlapBands(
    bandByBounds(
      labeled.map((item) => item.marker),
      (m) => centeredLabelBounds(m.pos, m.label, trackWidthPx),
    ),
    seedClusters,
  );

  for (let iter = 0; iter < 4; iter++) {
    const units = layoutUnits(resolved);
    if (units.length <= 1) break;

    const parent = units.map((_, idx) => idx);
    const find = (n: number): number => {
      let cur = n;
      while (parent[cur] !== cur) cur = parent[cur];
      return cur;
    };
    const unite = (x: number, y: number) => {
      const a = find(x);
      const b = find(y);
      if (a !== b) parent[b] = a;
    };

    let anyOverlap = false;
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        if (unitsOverlap(units[i], units[j], trackWidthPx)) {
          unite(i, j);
          anyOverlap = true;
        }
      }
    }
    if (!anyOverlap) break;

    const groups = new Map<number, PositionedMarker[]>();
    for (let i = 0; i < units.length; i++) {
      const root = find(i);
      const list = groups.get(root) ?? [];
      for (const m of units[i].markers) {
        if (!list.some((x) => markerIdentity(x) === markerIdentity(m))) {
          list.push(m);
        }
      }
      groups.set(root, list);
    }

    const keptClusters = resolved.filter(
      (item) => (item.clusterMembers?.length ?? 0) >= COMP_CLUSTER_MIN,
    );
    const forcedBands = [...groups.values()].map((g) =>
      [...g].sort((a, b) => a.pos - b.pos || a.label.localeCompare(b.label)),
    );
    resolved = layoutOverlapBands(forcedBands, keptClusters);
  }

  return resolved;
}

const TOOLTIP_EDGE_PAD = 8;

/**
 * How far to nudge a centered tooltip so it stays inside `container`.
 * Positive shifts right; negative shifts left. Uses layout sizes only —
 * never mutates the tooltip's transform.
 */
function measureTooltipShift(
  tooltipEl: HTMLElement,
  containerEl: HTMLElement,
  pad = TOOLTIP_EDGE_PAD,
): number {
  const tipWidth = tooltipEl.offsetWidth;
  const anchor = tooltipEl.offsetParent instanceof HTMLElement
    ? tooltipEl.offsetParent
    : tooltipEl.parentElement;
  if (!anchor || tipWidth <= 0) return 0;

  const containerRect = containerEl.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const anchorCenter = anchorRect.left + anchorRect.width / 2;
  const idealLeft = anchorCenter - tipWidth / 2;
  const minLeft = containerRect.left + pad;
  const maxLeft = containerRect.right - pad - tipWidth;
  const clampedLeft = Math.min(
    Math.max(idealLeft, minLeft),
    Math.max(minLeft, maxLeft),
  );
  return clampedLeft - idealLeft;
}

function markerKey(marker: PositionedMarker): string {
  return marker.id ?? `${marker.label}-${marker.value}`;
}

function clusterKey(members: PositionedMarker[]): string {
  return `cluster-${members.map(markerKey).join("|")}`;
}

/**
 * Tip paints above ticks within its marker group. The open group’s z-index
 * (see render) must also beat sibling markers — otherwise a neighbor’s tick
 * stacks above this tip’s z-50.
 */
const tooltipBaseClass =
  "absolute bottom-full left-1/2 z-20 mb-0.5 rounded px-1.5 py-0.5 text-xs font-medium shadow-md";

/** Keep tip open while the pointer crosses the gap into the tip’s visual box. */
const TOOLTIP_CLOSE_DELAY_MS = 140;

/** Fixed row under the track — clusters no longer grow this. */
const MARKERS_ROW_HEIGHT_PX = 24;

/** Original vertical tick height (Tailwind h-2). */
const TICK_HEIGHT_PX = 8;

/** Gap between tick/arm bottom and acronym (starred get extra air). */
const LABEL_GAP_PX = 2;
const STARRED_LABEL_GAP_PX = 6;

interface CompMarkersProps {
  markers: CompMarker[];
  getPos: (value: number) => number;
  formatValue: (value: number) => string;
  onSelect: (value: number) => void;
  disabled?: boolean;
  variant?: "default" | "ticket";
  /** When set, ease `left` on scale changes (ms). Matches thumb expand ease. */
  positionTransitionMs?: number;
}

export default function CompMarkers({
  markers,
  getPos,
  formatValue,
  onSelect,
  disabled = false,
  variant = "default",
  positionTransitionMs = 0,
}: CompMarkersProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [tooltipShift, setTooltipShift] = useState(0);
  const [tooltipReady, setTooltipReady] = useState(false);
  const [transitionsReady, setTransitionsReady] = useState(false);
  const [trackWidthPx, setTrackWidthPx] = useState(320);
  const containerRef = useRef<HTMLDivElement>(null);
  const openKeyRef = useRef<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTicket = variant === "ticket";

  openKeyRef.current = openKey;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setTrackWidthPx(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [markers.length]);

  const cancelScheduledClose = () => {
    if (closeTimerRef.current != null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // Skip animating from 0% on first paint.
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setTransitionsReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useLayoutEffect(() => {
    return () => cancelScheduledClose();
  }, []);

  useLayoutEffect(() => {
    if (!openKey || !containerRef.current) {
      setTooltipShift(0);
      setTooltipReady(false);
      return;
    }

    const tip = containerRef.current.querySelector<HTMLElement>(
      `[data-tooltip-id="${CSS.escape(openKey)}"]`,
    );
    if (!tip) {
      setTooltipShift(0);
      setTooltipReady(false);
      return;
    }

    setTooltipShift(measureTooltipShift(tip, containerRef.current));
    setTooltipReady(true);
  }, [openKey]);

  /**
   * Top edge of the markers row ≈ bottom of the slider. Overflowing tip/hit
   * targets can receive events while the cursor is still over the track — ignore
   * those until the pointer crosses this line (or is on an already-open tip).
   */
  const hoverGateTop = () =>
    containerRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;

  const isOverOpenTip = (clientX: number, clientY: number) => {
    const key = openKeyRef.current;
    if (!key || !containerRef.current) return false;
    const tip = containerRef.current.querySelector<HTMLElement>(
      `[data-tooltip-id="${CSS.escape(key)}"]`,
    );
    if (!tip || tip.classList.contains("opacity-0")) return false;
    const r = tip.getBoundingClientRect();
    return (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    );
  };

  /** True once the cursor is below the slider, or still interacting with an open tip. */
  const allowsTooltipAt = (clientX: number, clientY: number) =>
    clientY >= hoverGateTop() || isOverOpenTip(clientX, clientY);

  const openTooltip = (key: string) => {
    cancelScheduledClose();
    // Re-entering the same label (or its tip) must not flash opacity-0.
    if (openKeyRef.current === key) return;
    setTooltipReady(false);
    setTooltipShift(0);
    setOpenKey(key);
  };

  const closeTooltip = (key?: string) => {
    cancelScheduledClose();
    setOpenKey((k) => {
      if (key != null && k !== key) return k;
      return null;
    });
    setTooltipReady(false);
    setTooltipShift(0);
  };

  const scheduleCloseTooltip = (key?: string) => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      closeTooltip(key);
    }, TOOLTIP_CLOSE_DELAY_MS);
  };

  const tryOpenFromPointer = (
    key: string,
    clientX: number,
    clientY: number,
  ) => {
    if (!allowsTooltipAt(clientX, clientY)) return;
    openTooltip(key);
  };

  useLayoutEffect(() => {
    if (!openKey) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeTooltip();
      }
    };
    // Close as soon as the pointer moves back onto the slider (above the gate),
    // unless it’s on the open tip/list itself.
    const onPointerMove = (e: PointerEvent) => {
      if (!allowsTooltipAt(e.clientX, e.clientY)) {
        closeTooltip();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointermove", onPointerMove);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [openKey]);

  if (markers.length === 0) return null;

  const items = resolveLabelCollisions(
    layoutCompMarkers(markers, getPos),
    trackWidthPx,
  );
  const densityMode = shouldUseDensityMode(markers.length, items);
  const anyStarredLabel = items.some((it) => it.marker.starred);
  const anyStaircase = items.some(
    (it) => (it.stackSize ?? 1) >= COMP_STAIRCASE_SIZE,
  );
  const maxStack = items.reduce(
    (max, it) => Math.max(max, it.stackSize ?? 1),
    1,
  );
  // Tick + gap + stacked acronyms (stairs of 3, or up to star cap).
  const stackLabelStart =
    TICK_HEIGHT_PX +
    (anyStarredLabel ? STARRED_LABEL_GAP_PX : LABEL_GAP_PX);
  const stackRowHeight =
    maxStack > 1
      ? stackLabelStart + maxStack * 12
      : stackLabelStart + 12;
  // Ticks-only map: shorter row — unless starred / staircase force labels.
  const rowHeight =
    densityMode && !anyStarredLabel && !anyStaircase
      ? 14
      : Math.max(MARKERS_ROW_HEIGHT_PX, stackRowHeight);

  const positionTransition =
    transitionsReady && positionTransitionMs > 0
      ? `left ${positionTransitionMs}ms cubic-bezier(0.33, 1, 0.68, 1), opacity ${positionTransitionMs}ms ease-out`
      : undefined;

  const tickClass = isTicket
    ? "bg-ticket-ink/40 group-hover:bg-ticket-ink group-focus-within:bg-ticket-ink"
    : "bg-stone-500 group-hover:bg-theater-gold group-focus-within:bg-theater-gold";

  const starredTickClass = isTicket
    ? "bg-ticket-ink group-hover:bg-black group-focus-within:bg-black"
    : "bg-theater-gold group-hover:bg-[#f0d080] group-focus-within:bg-[#f0d080]";

  const labelClass = isTicket
    ? "text-ticket-ink/50 group-hover:text-ticket-ink group-focus-within:text-ticket-ink"
    : "text-stone-500 group-hover:text-theater-gold group-focus-within:text-theater-gold";

  const starredLabelClass = isTicket
    ? "text-ticket-ink font-semibold group-hover:text-black group-focus-within:text-black"
    : "text-theater-gold font-semibold group-hover:text-[#f0d080] group-focus-within:text-[#f0d080]";

  const tooltipClass = isTicket
    ? "border border-ticket-ink/35 bg-white/50 backdrop-blur-lg font-outfit text-ticket-ink"
    : "border border-cinema-700 bg-cinema-900 text-stone-200";

  const tooltipStyle = {
    transform: `translateX(calc(-50% + ${tooltipShift}px))`,
  };

  return (
    <div
      ref={containerRef}
      className="relative mt-1"
      style={{ height: `${rowHeight}px` }}
      onMouseLeave={() => scheduleCloseTooltip()}
      data-density={densityMode ? "ticks" : "labeled"}
    >
      {items.map((item) => {
        const {
          marker,
          showTick,
          side,
          corner,
          clusterMembers,
          stackIndex = 0,
          stackSize = 1,
        } = item;
        const isCluster =
          (clusterMembers?.length ?? 0) >= COMP_CLUSTER_MIN;
        const isStairs = stackSize >= COMP_STAIRCASE_SIZE;
        const isStarred = Boolean(marker.starred);
        // Starred comps keep a permanent acronym even in density mode.
        // Staircases (3 close comps) keep acronyms unless density is on.
        const showLabel = !densityMode || isStarred;
        const ticksOnlyChrome = densityMode && !isStarred;
        const key = isCluster
          ? clusterKey(clusterMembers!)
          : markerKey(marker);
        const displayName = marker.title ?? marker.label;
        const singleTooltip = `${displayName}: ${formatValue(marker.value)}`;
        const extraCount = isCluster ? clusterMembers!.length - 1 : 0;
        const compactLabel = isCluster
          ? `${marker.label} (+${extraCount})`
          : marker.label;
        const clusterAria = isCluster
          ? `${clusterMembers!.length} comps: ${clusterMembers!
              .map((m) => `${m.title ?? m.label} ${formatValue(m.value)}`)
              .join(", ")}`
          : isStarred
            ? `Starred comparison ${singleTooltip}`
            : singleTooltip;
        const isOpen = openKey === key;
        const showTooltip = isOpen && tooltipReady;

        // Corner pairs: seat labels at the outer tip of equal-length L-arms.
        // Non-corner pairs: hang near the tick (original fan).
        const labelPosClass =
          side === "left"
            ? corner
              ? "left-0 text-right"
              : "left-0 -translate-x-[calc(100%-12px)] text-right"
            : side === "right"
              ? corner
                ? "left-0 text-left"
                : "left-0 -translate-x-1.5 text-left"
              : "left-0 -translate-x-1/2 text-center";

        const labelTransform =
          side === "left" && corner
            ? `translateX(calc(-100% - ${CORNER_ARM_PX + CORNER_LABEL_GAP_PX}px))`
            : side === "right" && corner
              ? `translateX(${CORNER_ARM_PX + CORNER_LABEL_GAP_PX}px)`
              : undefined;

        // Density ticks-only: tip anchors to the tick; labeled (incl. starred) use acronym.
        const tipPosClass = ticksOnlyChrome
          ? "left-0 -translate-x-1/2 text-center"
          : labelPosClass;
        const tipTransform = ticksOnlyChrome ? undefined : labelTransform;

        // Original tick height; starred titles get extra gap under the mark / L-arm.
        const baseLabelTop =
          TICK_HEIGHT_PX + (isStarred ? STARRED_LABEL_GAP_PX : LABEL_GAP_PX);
        const labelTop = isStairs
          ? baseLabelTop + stackIndex * 12
          : baseLabelTop;
        const tipAnchorTop = ticksOnlyChrome ? 0 : labelTop;
        // Clusters keep a slightly wider mark; starred match normal tick thickness.
        const tickWide = isCluster;
        const markColorClass = isStarred ? starredTickClass : tickClass;

        const onTriggerBlur = (
          e: ReactFocusEvent<HTMLElement>,
          wrapEl: HTMLElement | null,
        ) => {
          const next = e.relatedTarget as Node | null;
          if (wrapEl && next && wrapEl.contains(next)) return;
          scheduleCloseTooltip(key);
        };

        const sortedCluster = isCluster
          ? [...clusterMembers!].sort(
              (a, b) =>
                Number(Boolean(b.starred)) - Number(Boolean(a.starred)) ||
                a.pos - b.pos ||
                a.label.localeCompare(b.label),
            )
          : null;

        const hitH = ticksOnlyChrome
          ? 14
          : Math.max(24, labelTop + 12);

        return (
          <div
            key={key}
            className="absolute top-0 w-0 group"
            style={{
              left: `${marker.pos}%`,
              height: hitH,
              transition: positionTransition,
              // Open tip must win over sibling ticks (their groups create stacking contexts).
              zIndex: isOpen ? 40 : isStarred ? 2 : 1,
            }}
            onMouseEnter={(e) =>
              tryOpenFromPointer(key, e.clientX, e.clientY)
            }
            onMouseMove={(e) =>
              tryOpenFromPointer(key, e.clientX, e.clientY)
            }
          >
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                // Clicks on overflowing chrome above the gate must not steal the slider.
                if (!allowsTooltipAt(e.clientX, e.clientY)) return;
                if (isCluster) {
                  openTooltip(key);
                  return;
                }
                onSelect(marker.value);
              }}
              onFocus={() => openTooltip(key)}
              onBlur={(e) =>
                onTriggerBlur(
                  e,
                  e.currentTarget.parentElement,
                )
              }
              // Wider hit target in ticks-only mode — no acronym to aim at.
              className={
                ticksOnlyChrome
                  ? "absolute -left-2.5 top-0 z-0 h-3.5 w-5"
                  : "absolute top-0 left-0 z-0 w-0"
              }
              style={ticksOnlyChrome ? undefined : { height: hitH }}
              aria-label={clusterAria}
              aria-expanded={isCluster ? isOpen : undefined}
              aria-haspopup={isCluster ? "listbox" : undefined}
              aria-controls={isCluster && isOpen ? `${key}-list` : undefined}
            >
              {/*
                Original h-2 tick. L-arms: same length from the value line center
                outward; labels sit past the arm tip so left/right match.
              */}
              <span
                className={`absolute top-0 z-0 h-2 -translate-x-1/2 transition-[colors,opacity] ${
                  ticksOnlyChrome ? "left-1/2" : "left-0"
                } ${
                  tickWide ? "w-1 rounded-sm" : "w-0.5"
                } ${markColorClass} ${showTick ? "opacity-100" : "opacity-0"}`}
                style={
                  positionTransitionMs > 0 && transitionsReady
                    ? { transitionDuration: `${positionTransitionMs}ms` }
                    : undefined
                }
                aria-hidden
              />
              {showLabel && corner && side === "left" && showTick && (
                <span
                  className={`absolute left-0 top-2 z-0 h-0.5 -translate-x-full transition-colors ${markColorClass}`}
                  style={{ width: CORNER_ARM_PX }}
                  aria-hidden
                />
              )}
              {showLabel && corner && side === "right" && showTick && (
                <span
                  className={`absolute left-0 top-2 z-0 h-0.5 transition-colors ${markColorClass}`}
                  style={{ width: CORNER_ARM_PX }}
                  aria-hidden
                />
              )}
              {showLabel && (
                <span
                  className={`absolute z-0 cursor-pointer text-[9px] leading-none transition-[colors,top] ${labelPosClass} ${
                    isStarred ? starredLabelClass : labelClass
                  }`}
                  style={{
                    top: `${labelTop}px`,
                    transform: labelTransform,
                    transitionDuration:
                      positionTransitionMs > 0 && transitionsReady
                        ? `${positionTransitionMs}ms`
                        : undefined,
                  }}
                >
                  {/* Horizontal padding = larger onSelect hit target beside the acronym. */}
                  <span
                    className={`relative inline-block px-1.5 ${
                      isCluster ? "max-w-[72px]" : "max-w-[68px]"
                    }`}
                  >
                    <span className="block truncate">{compactLabel}</span>
                  </span>
                </span>
              )}
            </button>

            {/*
              Tip layer must not steal clicks from the acronym (same spot, higher z).
              Only the open cluster list re-enables pointer events.
            */}
            <span
              className={`pointer-events-none absolute left-0 z-20 text-[9px] leading-none ${tipPosClass}`}
              style={{
                top: `${tipAnchorTop}px`,
                transform: tipTransform,
              }}
            >
              {/*
                Invisible sizer: matches acronym when labeled; tick-sized in
                density ticks-only so bottom-full sits just above the mark.
              */}
              <span
                className={`relative inline-block ${
                  ticksOnlyChrome
                    ? "h-2 w-0"
                    : isCluster
                      ? "max-w-[72px]"
                      : "max-w-[60px]"
                }`}
              >
                {showLabel && (
                  <span className="block truncate opacity-0" aria-hidden>
                    {compactLabel}
                  </span>
                )}
                {isCluster ? (
                  <ul
                    id={`${key}-list`}
                    role="listbox"
                    aria-label="Comparison titles"
                    data-tooltip-id={key}
                    style={
                      isOpen ? tooltipStyle : { transform: "translateX(-50%)" }
                    }
                    className={`${tooltipBaseClass} ${tooltipClass} max-h-40 min-w-[9.5rem] max-w-[14rem] space-y-0.5 overflow-y-auto py-1 text-left whitespace-normal ${
                      showTooltip
                        ? "pointer-events-auto opacity-100"
                        : "pointer-events-none opacity-0"
                    }`}
                  >
                    {sortedCluster!.map((m) => {
                      const name = m.title ?? m.label;
                      return (
                        <li key={markerKey(m)} role="option">
                          <button
                            type="button"
                            disabled={disabled}
                            tabIndex={showTooltip ? 0 : -1}
                            className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 ${
                              isTicket
                                ? "hover:bg-ticket-ink/10 focus-visible:ring-ticket-ink/40"
                                : "hover:bg-cinema-800 focus-visible:ring-theater-gold/50"
                            }`}
                            onClick={() => {
                              onSelect(m.value);
                              closeTooltip(key);
                            }}
                            onFocus={() => openTooltip(key)}
                            onBlur={(e) =>
                              onTriggerBlur(
                                e,
                                e.currentTarget.closest(".group"),
                              )
                            }
                          >
                            <span className="font-semibold">{name}</span>
                            <span className="opacity-70">
                              {" "}
                              · {formatValue(m.value)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <span
                    role="tooltip"
                    data-tooltip-id={key}
                    style={
                      isOpen ? tooltipStyle : { transform: "translateX(-50%)" }
                    }
                    className={`${tooltipBaseClass} ${tooltipClass} pointer-events-none whitespace-nowrap text-center ${
                      showTooltip ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {singleTooltip}
                  </span>
                )}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
