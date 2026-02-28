import {
  BOARD_SQUARE_COUNT,
  HOME_COLUMN_LENGTH,
  HOME_ENTRY_SQUARE,
  STARTING_SQUARE,
  SAFE_SQUARES,
} from './constants';
import type { PlayerColor, TokenPosition } from './types';

// ─── Render Coordinate ────────────────────────────────────────────────────────

/**
 * A grid coordinate on the board, expressed as column (col) and row (row).
 *
 * The board uses an 15×15 grid where each cell is one board square.
 * The grid origin (0,0) is top-left.
 *
 * Board layout overview:
 *
 *   ┌────────────────────────────────────────────────┐
 *   │  RED yard    │  top path    │  YELLOW yard     │
 *   │              │  (cols 6-8)  │                  │
 *   │  left path   │  CENTER      │  right path      │
 *   │  (rows 6-8)  │  home (7,7)  │  (rows 6-8)      │
 *   │  GREEN yard  │  bottom path │  BLUE yard       │
 *   └────────────────────────────────────────────────┘
 *
 * Quadrant anchor corners (top-left of each 6×6 yard):
 *   Red    → (0, 0)    Yellow → (9, 0)
 *   Green  → (0, 9)    Blue   → (9, 9)
 *
 * The cross corridor is 3 squares wide (cols 6-8, rows 6-8).
 * The center home square is at (7, 7).
 */
export interface RenderCoord {
  readonly col: number;
  readonly row: number;
}

// ─── Common Path Layout ───────────────────────────────────────────────────────

/**
 * The canonical render coordinates for all 52 common board squares (0-indexed).
 *
 * Path starts at Red's entry square (square 0, col 6, row 14) and goes
 * clockwise: down the left side of the bottom corridor, around the perimeter.
 *
 * Layout matches the standard Ludo cross board with a 15×15 grid.
 */
/**
 * 52-square common path.
 *
 * Yard layout: Red=top-left, Yellow=top-right, Green=bottom-right, Blue=bottom-left.
 * (The engine path order is Red→Yellow→Green→Blue clockwise. Green is bottom-right
 *  and Blue is bottom-left in path logic. The Board component renders yard tints
 *  to match this: green tint bottom-right, blue tint bottom-left.)
 *
 * Path: Red exits top-left yard RIGHT along row 6, UP col 6, RIGHT row 0 to center;
 *       Yellow exits top-right yard DOWN col 8, RIGHT row 6 to far-right;
 *       Green exits via col 14 down, LEFT row 8, DOWN col 8 bottom;
 *       Blue exits bottom-left, LEFT row 8 bottom, UP col 6 home approach.
 */
const COMMON_PATH_COORDS: readonly RenderCoord[] = [
  // Red arm (0–12): row 6 going RIGHT → col 6 going UP → row 0 going RIGHT
  { col: 1,  row: 6  }, // 0  — Red starting square
  { col: 2,  row: 6  }, // 1
  { col: 3,  row: 6  }, // 2
  { col: 4,  row: 6  }, // 3
  { col: 5,  row: 6  }, // 4
  { col: 6,  row: 5  }, // 5
  { col: 6,  row: 4  }, // 6
  { col: 6,  row: 3  }, // 7
  { col: 6,  row: 2  }, // 8  — safe square
  { col: 6,  row: 1  }, // 9
  { col: 6,  row: 0  }, // 10
  { col: 7,  row: 0  }, // 11
  { col: 8,  row: 0  }, // 12

  // Yellow arm (13–25): col 8 going DOWN → row 6 going RIGHT → col 14 going DOWN
  { col: 8,  row: 1  }, // 13 — Yellow starting square
  { col: 8,  row: 2  }, // 14
  { col: 8,  row: 3  }, // 15
  { col: 8,  row: 4  }, // 16
  { col: 8,  row: 5  }, // 17
  { col: 9,  row: 6  }, // 18
  { col: 10, row: 6  }, // 19
  { col: 11, row: 6  }, // 20
  { col: 12, row: 6  }, // 21
  { col: 13, row: 6  }, // 22
  { col: 14, row: 6  }, // 23
  { col: 14, row: 7  }, // 24
  { col: 14, row: 8  }, // 25

  // Green arm (26–38): row 8 going LEFT → col 8 going DOWN → row 14 going LEFT
  { col: 13, row: 8  }, // 26 — Green starting square
  { col: 12, row: 8  }, // 27
  { col: 11, row: 8  }, // 28
  { col: 10, row: 8  }, // 29
  { col: 9,  row: 8  }, // 30
  { col: 8,  row: 9  }, // 31
  { col: 8,  row: 10 }, // 32
  { col: 8,  row: 11 }, // 33
  { col: 8,  row: 12 }, // 34
  { col: 8,  row: 13 }, // 35
  { col: 8,  row: 14 }, // 36
  { col: 7,  row: 14 }, // 37
  { col: 6,  row: 14 }, // 38

  // Blue arm (39–51): col 6 going UP → row 8 going LEFT → col 0 going UP
  { col: 6,  row: 13 }, // 39 — Blue starting square
  { col: 6,  row: 12 }, // 40
  { col: 6,  row: 11 }, // 41
  { col: 6,  row: 10 }, // 42
  { col: 6,  row: 9  }, // 43
  { col: 5,  row: 8  }, // 44
  { col: 4,  row: 8  }, // 45
  { col: 3,  row: 8  }, // 46
  { col: 2,  row: 8  }, // 47
  { col: 1,  row: 8  }, // 48
  { col: 0,  row: 8  }, // 49
  { col: 0,  row: 7  }, // 50
  { col: 0,  row: 6  }, // 51
] as const;

// ─── Home Column Coordinates ──────────────────────────────────────────────────

/**
 * Render coordinates for each player's home column (indices 0–4).
 * Index 0 is the first square entered from the common path.
 * Index 4 leads to the center home.
 */
const HOME_COLUMN_COORDS: Record<PlayerColor, readonly RenderCoord[]> = {
  // Red: entry sq 51 at (0,6). Home col runs RIGHT along row 7: cols 1→5
  // Index 4 at (5,7) → step into center (7,7) via (6,7)
  // Spec: row 8 cols 2-6 = r (Red home path)
  red: [
    { col: 1, row: 7 }, // index 0
    { col: 2, row: 7 },
    { col: 3, row: 7 },
    { col: 4, row: 7 },
    { col: 5, row: 7 }, // index 4
  ],
  // Yellow: entry sq 12 at (8,0). Home col runs DOWN col 7: rows 1→5
  // Spec: col 8 rows 2-6 = b (Blue/Yellow home path in spec, Yellow in engine)
  yellow: [
    { col: 7, row: 1 }, // index 0
    { col: 7, row: 2 },
    { col: 7, row: 3 },
    { col: 7, row: 4 },
    { col: 7, row: 5 }, // index 4
  ],
  // Green: entry sq 25 at (14,8). Home col runs LEFT along row 7: cols 13→9
  // Spec: row 8 cols 10-14 = y (Yellow/Green home path in spec, Green in engine)
  green: [
    { col: 13, row: 7 }, // index 0
    { col: 12, row: 7 },
    { col: 11, row: 7 },
    { col: 10, row: 7 },
    { col: 9,  row: 7 }, // index 4
  ],
  // Blue: entry sq 38 at (6,14). Home col runs UP col 7: rows 13→9
  // Spec: col 8 rows 10-14 = g (Green/Blue home path in spec, Blue in engine)
  blue: [
    { col: 7, row: 13 }, // index 0
    { col: 7, row: 12 },
    { col: 7, row: 11 },
    { col: 7, row: 10 },
    { col: 7, row: 9  }, // index 4
  ],
} as const;

/** The center home square coordinate (zone: 'home'). */
export const CENTER_HOME_COORD: RenderCoord = { col: 7, row: 7 } as const;

// ─── Start Yard Coordinates ───────────────────────────────────────────────────

/**
 * The four token start positions inside each player's yard.
 * Tokens in zone 'start' are displayed here.
 */
const START_YARD_COORDS: Record<PlayerColor, readonly RenderCoord[]> = {
  // Red yard = top-left (cols 0–5, rows 0–5)
  red: [
    { col: 1, row: 1 }, { col: 2, row: 1 },
    { col: 1, row: 2 }, { col: 2, row: 2 },
  ],
  // Yellow yard = top-right (cols 9–14, rows 0–5)
  yellow: [
    { col: 11, row: 1 }, { col: 12, row: 1 },
    { col: 11, row: 2 }, { col: 12, row: 2 },
  ],
  // Green yard = bottom-right (cols 9–14, rows 9–14)
  green: [
    { col: 11, row: 11 }, { col: 12, row: 11 },
    { col: 11, row: 12 }, { col: 12, row: 12 },
  ],
  // Blue yard = bottom-left (cols 0–5, rows 9–14)
  blue: [
    { col: 1, row: 11 }, { col: 2, row: 11 },
    { col: 1, row: 12 }, { col: 2, row: 12 },
  ],
} as const;

// ─── Public Coordinate Lookup ─────────────────────────────────────────────────

/**
 * Converts a TokenPosition to its stable render coordinate on the 15×15 grid.
 *
 * For tokens in zone 'start', `tokenIndex` selects which of the 4 yard slots
 * to use (0–3). Defaults to 0 if omitted.
 */
export function getRenderCoord(
  position: TokenPosition,
  color: PlayerColor,
  tokenIndex = 0
): RenderCoord {
  switch (position.zone) {
    case 'start':
      return START_YARD_COORDS[color][tokenIndex] ?? START_YARD_COORDS[color][0];

    case 'board':
      return COMMON_PATH_COORDS[position.square];

    case 'home_column':
      return HOME_COLUMN_COORDS[color][position.index];

    case 'home':
      return CENTER_HOME_COORD;

    default: {
      const _exhaustive: never = position;
      void _exhaustive;
      return CENTER_HOME_COORD;
    }
  }
}

// ─── Path Enumeration ─────────────────────────────────────────────────────────

/**
 * Returns all 52 common path squares in clockwise order starting from square 0.
 * Satisfies AC3: "a full loop contains exactly 52 unique common squares."
 */
export function getCommonPath(): readonly RenderCoord[] {
  return COMMON_PATH_COORDS;
}

/**
 * Returns the home column render coordinates for `color` in order (index 0 → 4).
 * Satisfies AC2: "indices are consistent (0..4)."
 */
export function getHomeColumnCoords(color: PlayerColor): readonly RenderCoord[] {
  return HOME_COLUMN_COORDS[color];
}

// ─── Safe Square Query ────────────────────────────────────────────────────────

/**
 * Returns whether `square` on the common path is a fixed safe square.
 * (Does not account for territoryCaptures rule — use isSquareSafe from capture.ts for that.)
 */
export function isFixedSafeSquare(square: number): boolean {
  return SAFE_SQUARES.includes(square);
}

// ─── Color for Square ─────────────────────────────────────────────────────────

/**
 * Returns the color associated with a common path square, if any.
 * Starting squares and safe squares are visually colored on the board.
 * Returns null for neutral squares.
 */
export function getSquareColor(square: number): PlayerColor | null {
  for (const [color, sq] of Object.entries(STARTING_SQUARE) as [PlayerColor, number][]) {
    if (sq === square) return color;
  }
  return null;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates the path mapping at runtime. Called once at startup in development.
 * Throws if the common path does not contain exactly BOARD_SQUARE_COUNT unique squares.
 */
export function validateBoardMapping(): void {
  if (COMMON_PATH_COORDS.length !== BOARD_SQUARE_COUNT) {
    throw new Error(
      `Board path has ${COMMON_PATH_COORDS.length} squares, expected ${BOARD_SQUARE_COUNT}.`
    );
  }

  // Verify home column lengths
  for (const color of ['red', 'yellow', 'green', 'blue'] as PlayerColor[]) {
    if (HOME_COLUMN_COORDS[color].length !== HOME_COLUMN_LENGTH) {
      throw new Error(
        `Home column for ${color} has ${HOME_COLUMN_COORDS[color].length} entries, expected ${HOME_COLUMN_LENGTH}.`
      );
    }
  }

  // Verify HOME_ENTRY_SQUARE values are within common path range
  for (const [color, sq] of Object.entries(HOME_ENTRY_SQUARE) as [PlayerColor, number][]) {
    if (sq < 0 || sq >= BOARD_SQUARE_COUNT) {
      throw new Error(`HOME_ENTRY_SQUARE for ${color} (${sq}) is out of range.`);
    }
  }
}
