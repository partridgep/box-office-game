export const CAP_HEIGHT = 54;

type Point = { x: number; y: number };

/** `index` is the bulb's position along its stroke, so alternating patterns can follow each stroke. */
export type Bulb = Point & { index: number };

type Op =
  | { kind: 'line'; x: number; y: number; bulbs?: number }
  | { kind: 'arc'; cx: number; cy: number; r: number; from: number; to: number };

interface Stroke {
  start: [number, number];
  ops: Op[];
  closed?: boolean;
  /**
   * Lengthens (positive) or shortens (negative) the drawn line at its [start, end] without moving its bulbs.
   * Diagonals use this so their square caps either reach past the letter's clip box (then get cut flat)
   * or stay hidden inside the stroke they branch from.
   */
  extend?: [number, number];
}

interface Glyph {
  width: number;
  strokes: Stroke[];
}

const L = (x: number, y: number, bulbs?: number): Op => ({ kind: 'line', x, y, bulbs });
// Angles in degrees, 0 = right, 90 = down; sweeping from `from` towards `to`.
const A = (cx: number, cy: number, r: number, from: number, to: number): Op => ({
  kind: 'arc',
  cx,
  cy,
  r,
  from,
  to,
});

const pStroke: Stroke = { start: [0, 54], ops: [L(0, 0), L(20, 0), A(20, 13.5, 13.5, -90, 90), L(0, 27)] };
const midBar: Stroke = { start: [0, 27], ops: [L(24, 27)] };

// Letters are centerlines on a CAP_HEIGHT-tall grid; the visible letter is this centerline stroked thick.
// Proportions follow a geometric sans: round letters are true circles, bowls are full half-circles.
const GLYPHS: Record<string, Glyph> = {
  P: { width: 34, strokes: [pStroke] },
  R: { width: 34, strokes: [pStroke, { start: [16.48, 27], ops: [L(29, 54)], extend: [-6, 12] }] },
  E: { width: 30, strokes: [{ start: [30, 0], ops: [L(0, 0), L(0, 54), L(30, 54)] }, midBar] },
  F: { width: 30, strokes: [{ start: [30, 0], ops: [L(0, 0), L(0, 54)] }, midBar] },
  D: {
    width: 41,
    strokes: [{ start: [0, 0], ops: [L(14, 0), A(14, 27, 27, -90, 90), L(0, 54)], closed: true }],
  },
  I: { width: 0, strokes: [{ start: [0, 0], ops: [L(0, 54)] }] },
  C: {
    width: 46,
    strokes: [{ start: [44.36, 6.32], ops: [A(27, 27, 27, -50, -310)] }],
  },
  T: {
    width: 56,
    strokes: [
      { start: [0, 0], ops: [L(56, 0, 4)] },
      { start: [28, 0], ops: [L(28, 54)] },
    ],
  },
  B: {
    width: 34,
    strokes: [
      { start: [0, 54], ops: [L(0, 0), L(18, 0), A(18, 13, 13, -90, 90), L(0, 26)] },
      { start: [0, 26], ops: [L(20, 26), A(20, 40, 14, -90, 90), L(0, 54)] },
    ],
  },
  O: {
    width: 54,
    strokes: [{ start: [0, 27], ops: [A(27, 27, 27, 180, 360), A(27, 27, 27, 0, 180)], closed: true }],
  },
  X: {
    width: 44,
    strokes: [
      { start: [8, 0], ops: [L(36, 54)], extend: [12, 12] },
      { start: [36, 0], ops: [L(8, 54)], extend: [12, 12] },
    ],
  },
};

export interface MarqueeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LineLayout {
  path: string;
  bulbs: Bulb[];
  boxes: MarqueeBox[];
  width: number;
}

/** A laid-out line, in its own coordinates; draw it translated by (x, y). */
export interface MarqueeLine extends LineLayout {
  x: number;
  y: number;
}

export interface MarqueeLayout {
  lines: MarqueeLine[];
  width: number;
  /** Centerline extent: from the top of the first line to the baseline of the last. */
  height: number;
}

interface LineOptions {
  strokeWidth: number;
  letterGap: number;
  wordGap: number;
  bulbSpacing: number;
}

interface LayoutOptions extends LineOptions {
  lineGap: number;
}

interface Segment {
  length: number;
  at: (distance: number) => Point;
  startDir: Point;
  endDir: Point;
  bulbs?: number;
}

const round = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;

function extendedLine(stroke: Stroke, ox: number): string {
  const [op] = stroke.ops;
  if (stroke.ops.length !== 1 || op.kind !== 'line' || !stroke.extend) {
    throw new Error('Only single-line strokes can be extended');
  }
  const [sx, sy] = stroke.start;
  const length = Math.hypot(op.x - sx, op.y - sy);
  const dx = (op.x - sx) / length;
  const dy = (op.y - sy) / length;
  const [extendStart, extendEnd] = stroke.extend;
  return (
    `M${round(ox + sx - dx * extendStart)} ${round(sy - dy * extendStart)}` +
    `L${round(ox + op.x + dx * extendEnd)} ${round(op.y + dy * extendEnd)}`
  );
}

function pointAlong(run: Segment[], distance: number): Point {
  let remaining = distance;
  for (const segment of run) {
    if (remaining <= segment.length) return segment.at(remaining);
    remaining -= segment.length;
  }
  const last = run[run.length - 1];
  return last.at(last.length);
}

/**
 * Lays out each entry of `lines` as its own centered line. Each line's centerline spans y = 0..CAP_HEIGHT in
 * its own coordinates, with one SVG path for every letter's centerline plus bulbs sampled along those centerlines.
 */
export function layoutMarquee(lines: string[], { lineGap, ...options }: LayoutOptions): MarqueeLayout {
  const laidOut = lines.map((text) => layoutLine(text, options));
  const width = Math.max(...laidOut.map((line) => line.width));
  const lineHeight = CAP_HEIGHT + options.strokeWidth + lineGap;
  return {
    lines: laidOut.map((line, i) => ({ ...line, x: (width - line.width) / 2, y: i * lineHeight })),
    width,
    height: (lines.length - 1) * lineHeight + CAP_HEIGHT,
  };
}

function layoutLine(text: string, { strokeWidth, letterGap, wordGap, bulbSpacing }: LineOptions): LineLayout {
  const half = strokeWidth / 2;
  const minBulbDistance = bulbSpacing * 0.55;
  const pathParts: string[] = [];
  const bulbs: Bulb[] = [];
  const boxes: MarqueeBox[] = [];
  let cursor = 0;

  for (const char of text.toUpperCase()) {
    if (char === ' ') {
      cursor += wordGap - letterGap;
      continue;
    }
    const glyph = GLYPHS[char];
    if (!glyph) throw new Error(`No marquee glyph for "${char}"`);

    const ox = cursor + half;
    const letterBulbs: Bulb[] = [];

    for (const stroke of glyph.strokes) {
      let [x, y] = stroke.start;
      const strokePath = [`M${round(ox + x)} ${round(y)}`];
      const strokeBulbs: Point[] = [];
      const ops = stroke.closed ? [...stroke.ops, L(...stroke.start)] : stroke.ops;
      const segments: Segment[] = [];

      for (const op of ops) {
        if (op.kind === 'line') {
          const sx = x;
          const sy = y;
          const length = Math.hypot(op.x - sx, op.y - sy);
          const dir = { x: (op.x - sx) / length, y: (op.y - sy) / length };
          if (length > 0) {
            segments.push({
              length,
              at: (d) => ({ x: ox + sx + dir.x * d, y: sy + dir.y * d }),
              startDir: dir,
              endDir: dir,
              bulbs: op.bulbs,
            });
          }
          [x, y] = [op.x, op.y];
          strokePath.push(`L${round(ox + op.x)} ${round(op.y)}`);
        } else {
          const sweep = op.to > op.from ? 1 : -1;
          const tangent = (deg: number) => ({ x: -sweep * Math.sin(rad(deg)), y: sweep * Math.cos(rad(deg)) });
          segments.push({
            length: op.r * rad(Math.abs(op.to - op.from)),
            at: (d) => {
              const angle = rad(op.from) + (sweep * d) / op.r;
              return { x: ox + op.cx + op.r * Math.cos(angle), y: op.cy + op.r * Math.sin(angle) };
            },
            startDir: tangent(op.from),
            endDir: tangent(op.to),
          });
          [x, y] = [op.cx + op.r * Math.cos(rad(op.to)), op.cy + op.r * Math.sin(rad(op.to))];
          const largeArc = Math.abs(op.to - op.from) > 180 ? 1 : 0;
          strokePath.push(`A${op.r} ${op.r} 0 ${largeArc} ${sweep === 1 ? 1 : 0} ${round(ox + x)} ${round(y)}`);
        }
      }

      // Bulbs are spaced evenly along each smooth run, so every sharp corner gets a bulb.
      const runs: Segment[][] = [];
      for (const segment of segments) {
        const run = runs[runs.length - 1];
        const prev = run?.[run.length - 1];
        const smooth = prev && prev.endDir.x * segment.startDir.x + prev.endDir.y * segment.startDir.y > 0.996;
        if (smooth) run.push(segment);
        else runs.push([segment]);
      }

      for (const run of runs) {
        const total = run.reduce((sum, s) => sum + s.length, 0);
        const count = (run.length === 1 && run[0].bulbs) || Math.max(1, Math.round(total / bulbSpacing));
        for (let i = 0; i < count; i++) strokeBulbs.push(pointAlong(run, (total * i) / count));
      }

      if (stroke.closed) strokePath.push('Z');
      else strokeBulbs.push({ x: ox + x, y });
      pathParts.push(stroke.extend ? extendedLine(stroke, ox) : strokePath.join(''));

      strokeBulbs.forEach((bulb, index) => {
        const tooClose = letterBulbs.some((b) => Math.hypot(b.x - bulb.x, b.y - bulb.y) < minBulbDistance);
        if (!tooClose) letterBulbs.push({ x: round(bulb.x), y: round(bulb.y), index });
      });
    }

    bulbs.push(...letterBulbs);
    // Boxes reach into the letter gap so slanted diagonal ends are cut by the top/bottom edges, not the sides.
    boxes.push({
      x: cursor - letterGap / 2,
      y: -half,
      width: glyph.width + strokeWidth + letterGap,
      height: CAP_HEIGHT + strokeWidth,
    });
    cursor += glyph.width + strokeWidth + letterGap;
  }

  return { path: pathParts.join(''), bulbs, boxes, width: cursor - letterGap };
}
