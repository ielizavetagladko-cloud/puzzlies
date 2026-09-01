/**
 * Jigsaw piece geometry.
 *
 * A grid of rows x cols cells. Every inner edge gets a tab direction that is
 * shared by the two pieces it separates, so neighbouring pieces always
 * interlock. Edges are drawn as three cubic beziers: neck in, round head,
 * neck out — the classic jigsaw knob.
 */

export type Grid = {
  rows: number;
  cols: number;
  /** h[r][c] — edge between row r and r+1 in column c. +1: tab points down. */
  h: number[][];
  /** v[r][c] — edge between col c and c+1 in row r. +1: tab points right. */
  v: number[][];
};

/** Small deterministic PRNG so a puzzle always cuts the same way. */
export function makeRng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

export function hashSeed(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function makeGrid(rows: number, cols: number, seed: number): Grid {
  const rng = makeRng(seed);
  const pick = () => (rng() < 0.5 ? -1 : 1);

  const h = Array.from({ length: Math.max(rows - 1, 0) }, () =>
    Array.from({ length: cols }, pick),
  );
  const v = Array.from({ length: rows }, () =>
    Array.from({ length: Math.max(cols - 1, 0) }, pick),
  );

  return { rows, cols, h, v };
}

type Edges = { top: number; right: number; bottom: number; left: number };

/** Tab direction per edge from the piece's own point of view (+1 = sticking out). */
export function pieceEdges(grid: Grid, row: number, col: number): Edges {
  return {
    top: row === 0 ? 0 : -grid.h[row - 1][col],
    bottom: row === grid.rows - 1 ? 0 : grid.h[row][col],
    left: col === 0 ? 0 : -grid.v[row][col - 1],
    right: col === grid.cols - 1 ? 0 : grid.v[row][col],
  };
}

/**
 * How far a tab actually reaches beyond the cell, as a share of the tab scale.
 *
 * The head is one cubic bezier whose endpoints sit at v = 0.12 and whose two
 * control points sit at v = 0.44, so its peak is at t = 0.5:
 *   (0.12 + 3·0.44 + 3·0.44 + 0.12) / 8 = 0.36
 * The value below must stay above that, otherwise the sprite canvas is too
 * small and the tips of the tabs are cut off — which shows up as light gaps
 * between assembled pieces.
 */
const TAB_REACH = 0.38;

/** Extra room a sprite needs around its cell. */
export function pieceMargin(pieceW: number, pieceH: number) {
  return Math.ceil(tabScale(pieceW, pieceH) * TAB_REACH + 2);
}

function tabScale(pieceW: number, pieceH: number) {
  return Math.min(pieceW, pieceH) * 0.62;
}

/**
 * Path of a single piece with its cell top-left at (0, 0), drawn clockwise.
 * Tabs stick out beyond the cell by up to `pieceMargin`.
 */
export function piecePath(
  grid: Grid,
  row: number,
  col: number,
  pieceW: number,
  pieceH: number,
): Path2D {
  const edges = pieceEdges(grid, row, col);
  const scale = tabScale(pieceW, pieceH);
  const path = new Path2D();

  path.moveTo(0, 0);
  edge(path, 0, 0, 1, 0, pieceW, edges.top, scale);
  edge(path, pieceW, 0, 0, 1, pieceH, edges.right, scale);
  edge(path, pieceW, pieceH, -1, 0, pieceW, edges.bottom, scale);
  edge(path, 0, pieceH, 0, -1, pieceH, edges.left, scale);
  path.closePath();

  return path;
}

/**
 * One side of a piece. (dx, dy) is the travel direction; the outward normal is
 * (dy, -dx), which for a clockwise path always points away from the piece.
 */
function edge(
  path: Path2D,
  x0: number,
  y0: number,
  dx: number,
  dy: number,
  length: number,
  tab: number,
  scale: number,
) {
  const nx = dy;
  const ny = -dx;
  const px = (u: number, v: number) => x0 + dx * u * length + nx * v * scale * tab;
  const py = (u: number, v: number) => y0 + dy * u * length + ny * v * scale * tab;

  if (tab === 0) {
    path.lineTo(px(1, 0), py(1, 0));
    return;
  }

  path.lineTo(px(0.4, 0), py(0.4, 0));
  path.bezierCurveTo(
    px(0.42, 0.02),
    py(0.42, 0.02),
    px(0.35, 0.05),
    py(0.35, 0.05),
    px(0.35, 0.12),
    py(0.35, 0.12),
  );
  path.bezierCurveTo(
    px(0.14, 0.44),
    py(0.14, 0.44),
    px(0.86, 0.44),
    py(0.86, 0.44),
    px(0.65, 0.12),
    py(0.65, 0.12),
  );
  path.bezierCurveTo(
    px(0.65, 0.05),
    py(0.65, 0.05),
    px(0.58, 0.02),
    py(0.58, 0.02),
    px(0.6, 0),
    py(0.6, 0),
  );
  path.lineTo(px(1, 0), py(1, 0));
}
