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
  /**
   * Ephemeral mark injected while brushing a non-starred comp under star
   * focus mode — not a persistent slider preference.
   */
  transient?: boolean;
}

type PositionedMarker = CompMarker & { pos: number };

export type LabelSide = "center" | "left" | "right";

/**
 * One entry per visible control. `marker.pos` is always the true value
 * position on the track. Labels sit under that tick unless fanned; clusters
 * use range chrome + a midpoint label.
 */
export type MarkerLayout = {
  marker: PositionedMarker;
  /**
   * Label anchor. Defaults to `marker.pos` (under the tick).
   * Clusters set this to the range midpoint.
   */
  labelPos?: number;
  showTick: boolean;
  /** False when collision demoted this label (tick stays). Default true. */
  showLabel?: boolean;
  side: LabelSide;
  /** L-shaped tick arm when a pair is extremely close */
  corner: boolean;
  /**
   * When set (length >= COMP_CLUSTER_MIN), this control is a cluster: range
   * chrome, compact label, and a popover listing every member.
   */
  clusterMembers?: PositionedMarker[];
  /** True-pos left edge of cluster range chrome. */
  rangeStart?: number;
  /** True-pos right edge of cluster range chrome. */
  rangeEnd?: number;
  /** Vertical offset index when multiple labels share the exact same tick x. */
  stackIndex?: number;
  /** Size of a same-x vertical stack (rare). */
  stackSize?: number;
};

/** @deprecated Use MarkerLayout — kept as an alias for any external imports. */
export type LayoutItem = MarkerLayout;

/** Percent of track width — labels are ~60px, so ~10% on a typical slider. */
export const COMP_BAND_THRESHOLD = 10;

/**
 * Max span (last − first true pos) for one band / cluster / stair.
 * Collision merges must not exceed this — otherwise demote labels instead.
 */
export const COMP_BAND_MAX_SPAN = 8;

/** Below this gap, pairs get an L-arm so labels can fan farther out. */
export const COMP_CORNER_THRESHOLD = 4;

/**
 * Bands of this size (and up to CLUSTER_MIN - 1) fan outer labels left/right
 * instead of stacking in a shared midpoint column.
 */
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

/** Cluster chrome is slightly wider (matches max-w-[72px]). */
const CLUSTER_LABEL_MAX_WIDTH_PX = 72;

/** Padding used for collision width estimates (hit target still uses px-1.5). */
const LABEL_ESTIMATE_PAD_PX = 8;

/** Horizontal L-arm length — identical on left and right. */
const CORNER_ARM_PX = 12;

/** Extra gap past the L-arm before the acronym starts. */
const CORNER_LABEL_GAP_PX = 2;

/** Extra gap (track %) so labels don’t kiss — keep tight to avoid false demotions. */
const LABEL_COLLISION_PAD_PCT = 1;

/** Approx px per glyph at 9px medium (slight under-estimate; prefer show over hide). */
const LABEL_GLYPH_PX = 5.5;

/** Min glyph width for short acronyms (was 24 — too wide for "BT"/"AB"). */
const LABEL_MIN_GLYPH_PX = 14;

/** Max vertical nudge rows under a tick before we demote instead. */
const LABEL_STACK_MAX = 3;

/** Don't fan labels longer than this — they drift too far from their tick. */
const LABEL_FAN_MAX_CHARS = 6;

/** Soft-fan only when ticks are this close (track %). Wider → center + stack. */
const LABEL_FAN_MAX_GAP = COMP_CORNER_THRESHOLD;

function labelIsShort(label: string): boolean {
  return label.length <= LABEL_FAN_MAX_CHARS;
}

/** True when a pair may soft-fan (short acronyms + very tight gap). */
function canSoftFanPair(a: PositionedMarker, b: PositionedMarker): boolean {
  const left = a.pos <= b.pos ? a : b;
  const right = a.pos <= b.pos ? b : a;
  return (
    labelIsShort(left.label) &&
    labelIsShort(right.label) &&
    right.pos - left.pos <= LABEL_FAN_MAX_GAP
  );
}

/**
 * Compact track label for a cluster. Prefer the shortest acronym so `(+N)`
 * stays visible inside max-w-[72px]; fall back to `(+count)` when all leads
 * are long (e.g. full titles used as labels).
 */
export function clusterCompactLabel(
  members: Array<{ label: string; pos: number }>,
): string {
  if (members.length === 0) return "(+0)";
  const lead = [...members].sort(
    (a, b) =>
      a.label.length - b.label.length ||
      a.pos - b.pos ||
      a.label.localeCompare(b.label),
  )[0].label;
  const extra = members.length - 1;
  if (lead.length <= 6) return `${lead} (+${extra})`;
  return `(+${members.length})`;
}

function isClusterItem(item: MarkerLayout): boolean {
  return (item.clusterMembers?.length ?? 0) >= COMP_CLUSTER_MIN;
}

function labelAnchor(item: MarkerLayout): number {
  return item.labelPos ?? item.marker.pos;
}

function itemShowsLabel(item: MarkerLayout): boolean {
  return item.showLabel !== false;
}

/** True-pos span of a marker set (assumes unsorted ok). */
export function markersSpan(markers: Array<{ pos: number }>): number {
  if (markers.length <= 1) return 0;
  let min = markers[0].pos;
  let max = markers[0].pos;
  for (let i = 1; i < markers.length; i++) {
    min = Math.min(min, markers[i].pos);
    max = Math.max(max, markers[i].pos);
  }
  return max - min;
}

function midPos(markers: Array<{ pos: number }>): number {
  if (markers.length === 0) return 0;
  return markers.reduce((sum, m) => sum + m.pos, 0) / markers.length;
}

function sortedByPos(markers: PositionedMarker[]): PositionedMarker[] {
  return [...markers].sort(
    (a, b) => a.pos - b.pos || a.label.localeCompare(b.label),
  );
}

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
 * Push a band with every label centered under its own tick. Soft fan / stack
 * happen later in resolveLabelCollisions so long labels never drift away.
 */
function pushCenteredPack(
  items: MarkerLayout[],
  band: PositionedMarker[],
): void {
  for (const m of sortedByPos(band)) {
    items.push({
      marker: m,
      showTick: true,
      showLabel: true,
      side: "center",
      corner: false,
    });
  }
}

/**
 * Layout each marker at its true track position. Labels start centered under
 * their ticks; collision resolution may soft-fan short pairs or stack rows.
 * Unstarred 4+ → range cluster. Starred comps are pulled out of unstarred
 * clusters. Chains split when span exceeds `maxSpan`.
 */
export function layoutCompMarkers(
  markers: CompMarker[],
  getPos: (value: number) => number,
  bandThreshold = COMP_BAND_THRESHOLD,
  _cornerThreshold = COMP_CORNER_THRESHOLD,
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

  /** Dense unstarred band → one range control (true min→max) + droplist. */
  const pushCluster = (band: PositionedMarker[]) => {
    const members = sortedByPos(band);
    const column = midPos(members);
    items.push({
      marker: members[0],
      labelPos: column,
      showTick: true,
      showLabel: true,
      side: "center",
      corner: false,
      clusterMembers: members,
      rangeStart: members[0].pos,
      rangeEnd: members[members.length - 1].pos,
    });
  };

  /** Unstarred: 1–3 centered under ticks; 4+ range cluster. */
  const pushUnstarredBand = (band: PositionedMarker[]) => {
    if (band.length === 0) return;
    if (band.length >= COMP_CLUSTER_MIN) {
      pushCluster(band);
      return;
    }
    pushCenteredPack(items, band);
  };

  /**
   * Starred: stay labeled & emphasized — centered under ticks (no cluster).
   * Bounded by STARRED_COMPS_MAX so this stays readable.
   */
  const pushStarredBand = (band: PositionedMarker[]) => {
    if (band.length === 0) return;
    pushCenteredPack(items, band);
  };

  for (const band of bands) {
    const starred = band.filter((m) => m.starred);
    const rest = band.filter((m) => !m.starred);
    pushUnstarredBand(rest);
    pushStarredBand(starred);
  }
  return items;
}

/** Estimate acronym width as % of track (9px font + estimate padding). */
export function estimateLabelWidthPct(
  label: string,
  trackWidthPx: number,
  maxWidthPx = LABEL_MAX_WIDTH_PX,
): number {
  const glyphPx = Math.min(
    maxWidthPx,
    Math.max(LABEL_MIN_GLYPH_PX, label.length * LABEL_GLYPH_PX),
  );
  const px = glyphPx + LABEL_ESTIMATE_PAD_PX;
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
 * Stairs / clusters use `labelPos` (shared column); ticks stay at `marker.pos`.
 */
export function placedLabelBounds(
  item: MarkerLayout,
  trackWidthPx: number,
): { left: number; right: number } {
  if (!itemShowsLabel(item)) {
    const p = item.marker.pos;
    return { left: p, right: p };
  }
  const { marker, side, corner, clusterMembers } = item;
  const isCluster = isClusterItem(item);
  const label = isCluster
    ? clusterCompactLabel(clusterMembers!)
    : marker.label;
  const w = estimateLabelWidthPct(
    label,
    trackWidthPx,
    isCluster ? CLUSTER_LABEL_MAX_WIDTH_PX : LABEL_MAX_WIDTH_PX,
  );
  const armPct = pxToTrackPct(CORNER_ARM_PX + CORNER_LABEL_GAP_PX, trackWidthPx);
  const pos = labelAnchor(item);

  if (isCluster || side === "center") {
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
  return m.id ?? `${m.label}-${m.value}`;
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
  maxSpan = COMP_BAND_MAX_SPAN,
): MarkerLayout[] {
  const resolved: MarkerLayout[] = [...priorClusters];

  for (const band of bands) {
    // Respect fidelity span even if glyph banding chained them.
    const pieces = splitBandByMaxSpan(sortedByPos(band), maxSpan);
    for (const piece of pieces) {
      const allStarred = piece.every((m) => m.starred);
      if (!allStarred && piece.length >= COMP_CLUSTER_MIN) {
        const members = sortedByPos(piece);
        const column = midPos(members);
        resolved.push({
          marker: members[0],
          labelPos: column,
          showTick: true,
          showLabel: true,
          side: "center",
          corner: false,
          clusterMembers: members,
          rangeStart: members[0].pos,
          rangeEnd: members[members.length - 1].pos,
        });
        continue;
      }

      // 1–3 (or starred 4+): labels centered under each tick.
      pushCenteredPack(resolved, piece);
    }
  }

  return resolved.sort(
    (a, b) =>
      a.marker.pos - b.marker.pos ||
      a.marker.label.localeCompare(b.marker.label),
  );
}

/**
 * True when two layout items’ painted labels overlap in the same row.
 * Different stackIndex rows are vertically separated — readable, not a clash.
 * Demoted (tick-only) items do not collide.
 */
function placedLabelsOverlap(
  a: MarkerLayout,
  b: MarkerLayout,
  trackWidthPx: number,
): boolean {
  if (!itemShowsLabel(a) || !itemShowsLabel(b)) return false;

  // Vertically nudged labels (under own ticks) don’t fight each other.
  if ((a.stackIndex ?? 0) !== (b.stackIndex ?? 0)) return false;

  const ab = placedLabelBounds(a, trackWidthPx);
  const bb = placedLabelBounds(b, trackWidthPx);
  return (
    ab.left < bb.right + LABEL_COLLISION_PAD_PCT &&
    bb.left < ab.right + LABEL_COLLISION_PAD_PCT
  );
}

function demoteScore(item: MarkerLayout): number {
  // Higher = more OK to demote / nudge. No center bias — empty middles looked wrong.
  let score = 0;
  if (item.marker.starred) score -= 100;
  if (isClusterItem(item)) score -= 40;
  score += item.marker.label.length;
  score += item.marker.pos * 0.01;
  return score;
}

function pickCollisionVictim(a: MarkerLayout, b: MarkerLayout): "a" | "b" {
  if (a.marker.starred !== b.marker.starred) {
    return a.marker.starred ? "b" : "a";
  }
  return demoteScore(a) >= demoteScore(b) ? "a" : "b";
}

/** Atomic presentation groups (solo / fan pair / staircase / cluster) for merge. */
type LayoutUnit = {
  items: MarkerLayout[];
  markers: PositionedMarker[];
};

function unitMarkers(item: MarkerLayout): PositionedMarker[] {
  if (isClusterItem(item) && item.clusterMembers) {
    return item.clusterMembers;
  }
  return [item.marker];
}

/**
 * Group layout items into units so a fan pair or cluster merges as a whole
 * when any of its labels collide with a neighbor.
 */
function layoutUnits(items: MarkerLayout[]): LayoutUnit[] {
  const sorted = [...items].sort(
    (a, b) =>
      a.marker.pos - b.marker.pos ||
      (a.stackIndex ?? 0) - (b.stackIndex ?? 0) ||
      a.marker.label.localeCompare(b.marker.label),
  );
  const units: LayoutUnit[] = [];
  let i = 0;
  while (i < sorted.length) {
    const item = sorted[i];

    if (isClusterItem(item)) {
      units.push({
        items: [item],
        markers: unitMarkers(item),
      });
      i++;
      continue;
    }

    const next = sorted[i + 1];
    if (
      item.corner &&
      item.side === "left" &&
      next &&
      !isClusterItem(next) &&
      next.corner &&
      next.side === "right"
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
 * When labels still overlap after fanning: nudge the weaker one down a row
 * under its own tick (keeps the acronym visible) before demoting.
 */
function stackUnderTickCollisions(
  items: MarkerLayout[],
  trackWidthPx: number,
): MarkerLayout[] {
  const result = items.map((item) => ({
    ...item,
    stackIndex: item.stackIndex ?? 0,
    stackSize: Math.max(item.stackSize ?? 1, (item.stackIndex ?? 0) + 1),
  }));

  for (let iter = 0; iter < 8; iter++) {
    let stacked = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        if (!placedLabelsOverlap(result[i], result[j], trackWidthPx)) continue;
        if (isClusterItem(result[i]) || isClusterItem(result[j])) continue;

        const which = pickCollisionVictim(result[i], result[j]);
        const victim = which === "a" ? i : j;
        const cur = result[victim].stackIndex ?? 0;
        if (cur >= LABEL_STACK_MAX - 1) continue;

        const next = cur + 1;
        result[victim] = {
          ...result[victim],
          stackIndex: next,
          stackSize: Math.max(result[victim].stackSize ?? 1, next + 1),
        };
        stacked = true;
      }
    }
    if (!stacked) break;
  }

  return result;
}

/**
 * Last resort: hide the weaker label when glyphs still overlap after fan + stack.
 * Tick stays. Prefer keeping starred, clusters, and shorter acronyms.
 */
function demoteCollidingLabels(
  items: MarkerLayout[],
  trackWidthPx: number,
): MarkerLayout[] {
  const result = items.map((item) => ({ ...item }));

  for (let iter = 0; iter < 8; iter++) {
    let demoted = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        if (!placedLabelsOverlap(result[i], result[j], trackWidthPx)) continue;
        const which = pickCollisionVictim(result[i], result[j]);
        const victim = which === "a" ? i : j;
        if (!itemShowsLabel(result[victim])) continue;
        result[victim] = { ...result[victim], showLabel: false };
        demoted = true;
      }
    }
    if (!demoted) break;
  }

  return result;
}

/**
 * Soft-fan only for short, very tight centered pairs: near edge hugs the tick
 * (corner: false) so labels don’t drift past an L-arm. Long labels stay centered
 * and rely on stacking instead.
 */
function softFanShortCollisions(
  items: MarkerLayout[],
  trackWidthPx: number,
): MarkerLayout[] {
  const result = items.map((item) => ({ ...item }));

  for (let iter = 0; iter < 4; iter++) {
    let fanned = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];
        if (isClusterItem(a) || isClusterItem(b)) continue;
        if (!itemShowsLabel(a) || !itemShowsLabel(b)) continue;
        if (a.side !== "center" || b.side !== "center") continue;
        if (!placedLabelsOverlap(a, b, trackWidthPx)) continue;
        if (!canSoftFanPair(a.marker, b.marker)) continue;

        const left = a.marker.pos <= b.marker.pos ? i : j;
        const right = left === i ? j : i;
        result[left] = {
          ...result[left],
          side: "left",
          corner: false,
          labelPos: undefined,
        };
        result[right] = {
          ...result[right],
          side: "right",
          corner: false,
          labelPos: undefined,
        };
        fanned = true;
      }
    }
    if (!fanned) break;
  }

  return result;
}

/**
 * Re-band markers by estimated glyph overlap (not just value proximity).
 * Merges only when combined true-pos span ≤ COMP_BAND_MAX_SPAN. Remaining
 * collisions: stack under tick → soft-fan short pairs → demote.
 */
export function resolveLabelCollisions(
  items: MarkerLayout[],
  trackWidthPx: number,
  maxSpan = COMP_BAND_MAX_SPAN,
): MarkerLayout[] {
  if (items.length <= 1 || trackWidthPx <= 0) return items;

  const seedClusters = items.filter(isClusterItem);
  const labeled = items.filter((item) => !isClusterItem(item));

  let resolved: MarkerLayout[] =
    labeled.length === 0
      ? [...seedClusters]
      : layoutOverlapBands(
          bandByBounds(
            labeled.map((item) => item.marker),
            (m) => centeredLabelBounds(m.pos, m.label, trackWidthPx),
          ),
          seedClusters,
          maxSpan,
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

    let anyMerge = false;
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        if (!unitsOverlap(units[i], units[j], trackWidthPx)) continue;
        const combined = [...units[i].markers, ...units[j].markers];
        // Only merge when the true-value span stays within the fidelity cap.
        if (markersSpan(combined) > maxSpan) continue;
        unite(i, j);
        anyMerge = true;
      }
    }
    if (!anyMerge) break;

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

    const forcedBands = [...groups.values()].map((g) => sortedByPos(g));
    resolved = layoutOverlapBands(forcedBands, [], maxSpan);
  }

  // Prefer keeping labels under ticks: stack first, soft-fan only short/tight.
  resolved = stackUnderTickCollisions(resolved, trackWidthPx);
  resolved = softFanShortCollisions(resolved, trackWidthPx);
  resolved = stackUnderTickCollisions(resolved, trackWidthPx);
  return demoteCollidingLabels(resolved, trackWidthPx);
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

/**
 * Extra lift above the markers row so brush tips clear the slider
 * (LogMoneySlider / RT track row is h-5) and leave the tick visible.
 */
const BRUSH_TOOLTIP_TRACK_CLEARANCE_PX = 26;
/** Slide between comps while scrubbing Historical Comps (brush only). */
const BRUSH_SLIDE_MS = 180;
/** Soft fade when brush tip copy swaps mid-scrub. */
const BRUSH_CONTENT_FADE_MS = 90;

/** Gap between tick/arm bottom and acronym (starred get extra air). */
const LABEL_GAP_PX = 2;
const STARRED_LABEL_GAP_PX = 6;

type BrushTipTarget = { pos: number; text: string };

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface CompMarkersProps {
  markers: CompMarker[];
  getPos: (value: number) => number;
  formatValue: (value: number) => string;
  onSelect: (value: number) => void;
  disabled?: boolean;
  variant?: "default" | "ticket";
  /** When set, ease `left` on scale changes (ms). Matches thumb expand ease. */
  positionTransitionMs?: number;
  /** CompMovie.id from Historical Comps — emphasize matching ticks (linked brushing). */
  highlightedCompMovieId?: string | null;
}

function markerMatchesComp(
  marker: Pick<CompMarker, "compMovieId">,
  compMovieId: string | null | undefined,
): boolean {
  return Boolean(compMovieId && marker.compMovieId === compMovieId);
}

/** Resolve the tick under brush for a CompMovie.id (member pos inside clusters). */
function findBrushTipTarget(
  items: MarkerLayout[],
  compMovieId: string,
  formatValue: (value: number) => string,
): BrushTipTarget | null {
  for (const item of items) {
    const members = item.clusterMembers;
    const clustered = (members?.length ?? 0) >= COMP_CLUSTER_MIN;
    if (clustered) {
      const member = members!.find((m) =>
        markerMatchesComp(m, compMovieId),
      );
      if (!member) continue;
      const name = member.title ?? member.label;
      return {
        pos: member.pos,
        text: `${name}: ${formatValue(member.value)}`,
      };
    }
    if (!markerMatchesComp(item.marker, compMovieId)) continue;
    const name = item.marker.title ?? item.marker.label;
    return {
      pos: item.marker.pos,
      text: `${name}: ${formatValue(item.marker.value)}`,
    };
  }
  return null;
}

export default function CompMarkers({
  markers,
  getPos,
  formatValue,
  onSelect,
  disabled = false,
  variant = "default",
  positionTransitionMs = 0,
  highlightedCompMovieId = null,
}: CompMarkersProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [tooltipShift, setTooltipShift] = useState(0);
  const [tooltipReady, setTooltipReady] = useState(false);
  const [transitionsReady, setTransitionsReady] = useState(false);
  const [trackWidthPx, setTrackWidthPx] = useState(320);
  const containerRef = useRef<HTMLDivElement>(null);
  const openKeyRef = useRef<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Shared tip while scrubbing Historical Comps (slides between ticks). */
  const [brushTarget, setBrushTarget] = useState<BrushTipTarget | null>(null);
  const [brushDisplayText, setBrushDisplayText] = useState("");
  const [brushContentOpaque, setBrushContentOpaque] = useState(true);
  const [brushShift, setBrushShift] = useState(0);
  const [brushSlideReady, setBrushSlideReady] = useState(false);
  const brushTipRef = useRef<HTMLSpanElement>(null);
  const brushContentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const brushTextRef = useRef("");
  const reduceMotionRef = useRef(false);
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
    reduceMotionRef.current = prefersReducedMotion();
    const id = requestAnimationFrame(() => setTransitionsReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useLayoutEffect(() => {
    return () => {
      cancelScheduledClose();
      if (brushContentTimerRef.current != null) {
        clearTimeout(brushContentTimerRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!openKey || !containerRef.current || brushTarget) {
      if (!openKey) {
        setTooltipShift(0);
        setTooltipReady(false);
      }
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
  }, [openKey, brushTarget]);

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
    // Local tick hover only — brush uses the shared sliding tip.
    if (highlightedCompMovieId) return;
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
    if (highlightedCompMovieId) return;
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

  // Linked brushing: shared tip above the track (slides between matching ticks).
  useLayoutEffect(() => {
    if (!highlightedCompMovieId || markers.length === 0) {
      setBrushTarget(null);
      return;
    }

    // Dismiss any local tip while brushing from the comps list.
    if (openKeyRef.current) closeTooltip();

    const layoutItems = resolveLabelCollisions(
      layoutCompMarkers(markers, getPos),
      trackWidthPx,
    );
    const next = findBrushTipTarget(
      layoutItems,
      highlightedCompMovieId,
      formatValue,
    );
    setBrushTarget((prev) => {
      if (
        prev &&
        next &&
        prev.pos === next.pos &&
        prev.text === next.text
      ) {
        return prev;
      }
      return next;
    });
  }, [
    highlightedCompMovieId,
    markers,
    getPos,
    trackWidthPx,
    formatValue,
  ]);

  // Soft-fade brush tip copy when scrubbing between comps.
  useLayoutEffect(() => {
    if (brushContentTimerRef.current != null) {
      clearTimeout(brushContentTimerRef.current);
      brushContentTimerRef.current = null;
    }
    if (!brushTarget) {
      brushTextRef.current = "";
      setBrushDisplayText("");
      setBrushContentOpaque(true);
      setBrushSlideReady(false);
      return;
    }

    const nextText = brushTarget.text;
    const prevText = brushTextRef.current;
    if (!prevText || prevText === nextText || reduceMotionRef.current) {
      brushTextRef.current = nextText;
      setBrushDisplayText(nextText);
      setBrushContentOpaque(true);
      return;
    }

    // Keep previous copy while fading out, then swap in the new line.
    setBrushContentOpaque(false);
    brushContentTimerRef.current = setTimeout(() => {
      brushContentTimerRef.current = null;
      brushTextRef.current = nextText;
      setBrushDisplayText(nextText);
      setBrushContentOpaque(true);
    }, BRUSH_CONTENT_FADE_MS);
  }, [brushTarget]);

  // Enable left transition after the tip’s first paint (avoid flying from 0%).
  useLayoutEffect(() => {
    if (!brushTarget) {
      setBrushSlideReady(false);
      return;
    }
    if (brushSlideReady || reduceMotionRef.current) return;
    const id = requestAnimationFrame(() => setBrushSlideReady(true));
    return () => cancelAnimationFrame(id);
  }, [brushTarget, brushSlideReady]);

  useLayoutEffect(() => {
    if (!brushTarget || !brushTipRef.current || !containerRef.current) {
      setBrushShift(0);
      return;
    }
    setBrushShift(
      measureTooltipShift(brushTipRef.current, containerRef.current),
    );
  }, [brushTarget, brushDisplayText, trackWidthPx, brushContentOpaque]);

  if (markers.length === 0) return null;

  const items = resolveLabelCollisions(
    layoutCompMarkers(markers, getPos),
    trackWidthPx,
  );
  const densityMode = shouldUseDensityMode(markers.length, items);
  const anyStarredLabel = items.some((it) => it.marker.starred);
  const anyVisibleLabel = items.some(
    (it) => itemShowsLabel(it) && (!densityMode || it.marker.starred || isClusterItem(it)),
  );
  const maxStack = items.reduce(
    (max, it) => Math.max(max, it.stackSize ?? 1),
    1,
  );
  const stackLabelStart =
    TICK_HEIGHT_PX +
    (anyStarredLabel ? STARRED_LABEL_GAP_PX : LABEL_GAP_PX);
  const stackRowHeight =
    maxStack > 1
      ? stackLabelStart + maxStack * 12
      : stackLabelStart + 12;
  const rowHeight =
    densityMode && !anyStarredLabel && !anyVisibleLabel
      ? 14
      : Math.max(MARKERS_ROW_HEIGHT_PX, stackRowHeight);

  const positionTransition =
    transitionsReady && positionTransitionMs > 0
      ? `left ${positionTransitionMs}ms cubic-bezier(0.33, 1, 0.68, 1), opacity ${positionTransitionMs}ms ease-out`
      : undefined;

  const brushing = Boolean(highlightedCompMovieId);
  /** Only brush/dim when this track actually has a matching tick. */
  const hasMatchOnTrack =
    brushing &&
    markers.some((m) => markerMatchesComp(m, highlightedCompMovieId));
  /**
   * Transient non-starred preview in a dense map: hide every other tick so the
   * hover mark doesn’t fight clusters / acronyms.
   */
  const soloTransientBrush =
    hasMatchOnTrack &&
    densityMode &&
    markers.some(
      (m) =>
        m.transient && markerMatchesComp(m, highlightedCompMovieId),
    );

  /** Dense + transient brush: only the preview tick (not its cluster). */
  const displayItems: MarkerLayout[] = soloTransientBrush
    ? items.flatMap((item) => {
        const members = item.clusterMembers;
        const clustered = (members?.length ?? 0) >= COMP_CLUSTER_MIN;
        if (clustered) {
          const member = members!.find((m) =>
            markerMatchesComp(m, highlightedCompMovieId),
          );
          if (!member) return [];
          return [
            {
              marker: member,
              showTick: true,
              showLabel: true,
              side: "center" as const,
              corner: false,
            },
          ];
        }
        if (!markerMatchesComp(item.marker, highlightedCompMovieId)) {
          return [];
        }
        return [item];
      })
    : items;

  const tickClass = isTicket
    ? "bg-ticket-ink/40 group-hover:bg-ticket-ink group-focus-within:bg-ticket-ink"
    : "bg-stone-500 group-hover:bg-theater-gold group-focus-within:bg-theater-gold";

  const starredTickClass = isTicket
    ? "bg-ticket-ink group-hover:bg-black group-focus-within:bg-black"
    : "bg-theater-gold group-hover:bg-[#f0d080] group-focus-within:bg-[#f0d080]";

  const tickActiveClass = isTicket ? "bg-ticket-ink" : "bg-theater-gold";
  const starredTickActiveClass = isTicket ? "bg-black" : "bg-[#f0d080]";

  const labelClass = isTicket
    ? "text-ticket-ink/50 group-hover:text-ticket-ink group-focus-within:text-ticket-ink"
    : "text-stone-500 group-hover:text-theater-gold group-focus-within:text-theater-gold";

  const starredLabelClass = isTicket
    ? "text-ticket-ink font-semibold group-hover:text-black group-focus-within:text-black"
    : "text-theater-gold font-semibold group-hover:text-[#f0d080] group-focus-within:text-[#f0d080]";

  const labelActiveClass = isTicket ? "text-ticket-ink" : "text-theater-gold";
  const starredLabelActiveClass = isTicket
    ? "text-black font-semibold"
    : "text-[#f0d080] font-semibold";

  const tooltipClass = isTicket
    ? "border border-ticket-ink/35 bg-white/50 backdrop-blur-lg font-outfit text-ticket-ink"
    : "border border-cinema-700 bg-cinema-900 text-stone-200";

  const tooltipStyle = {
    transform: `translateX(calc(-50% + ${tooltipShift}px))`,
  };

  const brushSlideTransition =
    brushSlideReady && !reduceMotionRef.current
      ? `left ${BRUSH_SLIDE_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`
      : undefined;

  return (
    <div
      ref={containerRef}
      className="relative mt-1 overflow-visible"
      style={{ height: `${rowHeight}px` }}
      onMouseLeave={() => scheduleCloseTooltip()}
      data-density={densityMode ? "ticks" : "labeled"}
    >
      {displayItems.map((item) => {
        const {
          marker,
          showTick,
          side,
          corner,
          clusterMembers,
          rangeStart,
          rangeEnd,
          stackIndex = 0,
          stackSize = 1,
        } = item;
        const isCluster =
          (clusterMembers?.length ?? 0) >= COMP_CLUSTER_MIN;
        const isStarred = Boolean(marker.starred);
        const columnPos = labelAnchor(item);
        // Group sits on the tick (true pos) except clusters (range midpoint).
        const groupPos = isCluster ? columnPos : marker.pos;
        const labelOffsetPx =
          ((columnPos - groupPos) / 100) * trackWidthPx;
        // Starred / clusters keep labels in density mode; demotion may hide.
        const layoutWantsLabel = itemShowsLabel(item);
        const showLabel =
          layoutWantsLabel && (!densityMode || isStarred || isCluster);
        const ticksOnlyChrome = !showLabel;
        const key = isCluster
          ? clusterKey(clusterMembers!)
          : markerKey(marker);
        const displayName = marker.title ?? marker.label;
        const singleTooltip = `${displayName}: ${formatValue(marker.value)}`;
        const compactLabel = isCluster
          ? clusterCompactLabel(clusterMembers!)
          : marker.label;
        const clusterByPos = isCluster
          ? sortedByPos(clusterMembers!)
          : null;
        const clusterAria = isCluster
          ? `${clusterByPos!.length} comps from ${formatValue(
              clusterByPos![0].value,
            )} to ${formatValue(
              clusterByPos![clusterByPos!.length - 1].value,
            )}: ${clusterByPos!
              .map((m) => `${m.title ?? m.label} ${formatValue(m.value)}`)
              .join(", ")}`
          : isStarred
            ? `Starred comparison ${singleTooltip}`
            : singleTooltip;
        const isOpen = openKey === key && !brushTarget;
        const showTooltip = isOpen && tooltipReady;

        const hasRange =
          isCluster &&
          rangeStart != null &&
          rangeEnd != null &&
          rangeEnd - rangeStart > 0.05;
        const rangeLeftPx = hasRange
          ? ((rangeStart! - groupPos) / 100) * trackWidthPx
          : 0;
        const rangeWidthPx = hasRange
          ? Math.max(
              ((rangeEnd! - rangeStart!) / 100) * trackWidthPx,
              4,
            )
          : 0;

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

        const fanTransform =
          side === "left" && corner
            ? `translateX(calc(-100% - ${CORNER_ARM_PX + CORNER_LABEL_GAP_PX}px))`
            : side === "right" && corner
              ? `translateX(${CORNER_ARM_PX + CORNER_LABEL_GAP_PX}px)`
              : undefined;

        // Clusters: label sits at range midpoint (labelOffset from groupPos).
        const labelTransform =
          labelOffsetPx !== 0
            ? fanTransform
              ? `translateX(${labelOffsetPx}px) ${fanTransform}`
              : `translateX(${labelOffsetPx}px) translateX(-50%)`
            : fanTransform;

        const tipPosClass = ticksOnlyChrome
          ? "left-0 -translate-x-1/2 text-center"
          : labelPosClass;
        const tipTransform = ticksOnlyChrome
          ? undefined
          : labelTransform;

        const baseLabelTop =
          TICK_HEIGHT_PX + (isStarred ? STARRED_LABEL_GAP_PX : LABEL_GAP_PX);
        const labelTop =
          stackSize > 1 ? baseLabelTop + stackIndex * 12 : baseLabelTop;
        const tipAnchorTop = ticksOnlyChrome ? 0 : labelTop;
        const itemMatches = isCluster
          ? clusterMembers!.some((m) =>
              markerMatchesComp(m, highlightedCompMovieId),
            )
          : markerMatchesComp(marker, highlightedCompMovieId);
        const forcedHighlight =
          (hasMatchOnTrack && itemMatches) || soloTransientBrush;
        const isDimmed =
          !soloTransientBrush && hasMatchOnTrack && !itemMatches;
        const markColorClass = forcedHighlight
          ? isStarred
            ? starredTickActiveClass
            : tickActiveClass
          : isStarred
            ? starredTickClass
            : tickClass;
        const labelColorClass = forcedHighlight
          ? isStarred
            ? starredLabelActiveClass
            : labelActiveClass
          : isStarred
            ? starredLabelClass
            : labelClass;

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
            className={`absolute top-0 w-0 group transition-opacity ${
              isDimmed ? "opacity-30" : "opacity-100"
            }`}
            style={{
              left: `${groupPos}%`,
              height: hitH,
              transition: positionTransition
                ? `${positionTransition}, opacity 120ms ease-out`
                : "opacity 120ms ease-out",
              zIndex: isOpen
                ? 40
                : forcedHighlight
                  ? 30
                  : isStarred
                    ? 2
                    : 1,
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
              {/* Range chrome: bar + member ticks at true positions (no end caps). */}
              {hasRange ? (
                <>
                  <span
                    className={`absolute top-1 z-0 h-0.5 rounded-full transition-colors ${markColorClass} ${
                      showTick ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      left: rangeLeftPx,
                      width: rangeWidthPx,
                      transitionDuration:
                        positionTransitionMs > 0 && transitionsReady
                          ? `${positionTransitionMs}ms`
                          : undefined,
                    }}
                    aria-hidden
                  />
                  {clusterMembers!.map((m) => {
                    const memberHighlight =
                      hasMatchOnTrack &&
                      markerMatchesComp(m, highlightedCompMovieId);
                    const memberColor = memberHighlight
                      ? m.starred
                        ? starredTickActiveClass
                        : tickActiveClass
                      : markColorClass;
                    return (
                      <span
                        key={markerKey(m)}
                        className={`absolute top-0 z-0 h-2 w-0.5 -translate-x-1/2 transition-colors ${memberColor}`}
                        style={{
                          left:
                            ((m.pos - groupPos) / 100) * trackWidthPx,
                        }}
                        aria-hidden
                      />
                    );
                  })}
                </>
              ) : (
                <span
                  className={`absolute top-0 z-0 h-2 w-0.5 -translate-x-1/2 transition-[colors,opacity] ${
                    ticksOnlyChrome ? "left-1/2" : "left-0"
                  } ${markColorClass} ${showTick ? "opacity-100" : "opacity-0"}`}
                  style={
                    positionTransitionMs > 0 && transitionsReady
                      ? { transitionDuration: `${positionTransitionMs}ms` }
                      : undefined
                  }
                  aria-hidden
                />
              )}
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
                  className={`absolute z-0 cursor-pointer text-[9px] leading-none transition-[colors,top] ${labelPosClass} ${labelColorClass}`}
                  style={{
                    top: `${labelTop}px`,
                    transform: labelTransform,
                    transitionDuration:
                      positionTransitionMs > 0 && transitionsReady
                        ? `${positionTransitionMs}ms`
                        : undefined,
                  }}
                >
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

            <span
              className={`pointer-events-none absolute left-0 z-20 text-[9px] leading-none ${tipPosClass}`}
              style={{
                top: `${tipAnchorTop}px`,
                transform: tipTransform,
              }}
            >
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
                    className={`${tooltipBaseClass} ${tooltipClass} max-h-40 min-w-[11rem] max-w-[18rem] space-y-0.5 overflow-y-auto py-1 text-left whitespace-normal ${
                      showTooltip
                        ? "pointer-events-auto opacity-100"
                        : "pointer-events-none opacity-0"
                    }`}
                  >
                    {sortedCluster!.map((m) => {
                      const name = m.title ?? m.label;
                      const amount = formatValue(m.value);
                      return (
                        <li key={markerKey(m)} role="option">
                          <button
                            type="button"
                            disabled={disabled}
                            tabIndex={showTooltip ? 0 : -1}
                            aria-label={`${name}, ${amount}`}
                            className={`flex w-full items-baseline gap-1.5 rounded px-1.5 py-0.5 text-left text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 ${
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
                            <span className="min-w-0 flex-1 truncate font-semibold">
                              {name}
                            </span>
                            <span className="shrink-0 opacity-70 tabular-nums">
                              {amount}
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

      {brushTarget && brushDisplayText ? (
        <div
          className="pointer-events-none absolute top-0 z-30 w-0"
          style={{
            left: `${brushTarget.pos}%`,
            transition: brushSlideTransition,
          }}
        >
          <span
            ref={brushTipRef}
            role="tooltip"
            data-tooltip-id="brush-tip"
            className={`${tooltipBaseClass} ${tooltipClass} pointer-events-none whitespace-nowrap text-center opacity-100`}
            style={{
              marginBottom: BRUSH_TOOLTIP_TRACK_CLEARANCE_PX,
              transform: `translateX(calc(-50% + ${brushShift}px))`,
            }}
          >
            <span
              className={
                reduceMotionRef.current
                  ? undefined
                  : "inline-block transition-opacity ease-out"
              }
              style={
                reduceMotionRef.current
                  ? undefined
                  : {
                      opacity: brushContentOpaque ? 1 : 0,
                      transitionDuration: `${BRUSH_CONTENT_FADE_MS}ms`,
                    }
              }
            >
              {brushDisplayText}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
