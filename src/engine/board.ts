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
 *
 * Squares 0–51, clockwise starting from Red's starting square at (6, 14):
 *
 *   Red side (0–12):    bottom corridor going right + right side going up
 *   Yellow side (13–25): top-right going left + top corridor going left
 *   Green side (26–38): top-left going right going down + left side going down
 *   Blue side (39–51):  bottom corridor going right
 */
const COMMON_PATH_COORDS: readonly RenderCoord[] = [
  // Red starting square and approach (0–12)
  { col: 6, row: 14 }, // 0 — Red start
  { col: 6, row: 13 },
  { col: 6, row: 12 },
  { col: 6, row: 11 },
  { col: 6, row: 10 },
  { col: 6, row: 9  }, // 5
  { col: 5, row: 8  },
  { col: 4, row: 8  },
  { col: 3, row: 8  }, // 8 — safe square
  { col: 2, row: 8  },
  { col: 1, row: 8  },
  { col: 0, row: 8  },
  { col: 0, row: 7  }, // 12

  // Yellow starting square and approach (13–25)
  { col: 0, row: 6  }, // 13 — Yellow start
  { col: 1, row: 6  },
  { col: 2, row: 6  },
  { col: 3, row: 6  },
  { col: 4, row: 6  },
  { col: 5, row: 6  },
  { col: 6, row: 5  }, // 19
  { col: 6, row: 4  },
  { col: 6, row: 3  }, // 21 — safe square
  { col: 6, row: 2  },
  { col: 6, row: 1  },
  { col: 6, row: 0  },
  { col: 7, row: 0  }, // 25

  // Green starting square and approach (26–38)
  { col: 8, row: 0  }, // 26 — Green start
  { col: 8, row: 1  },
  { col: 8, row: 2  },
  { col: 8, row: 3  },
  { col: 8, row: 4  },
  { col: 8, row: 5  },
  { col: 9, row: 6  }, // 32
  { col: 10, row: 6 },
  { col: 11, row: 6 }, // 34 — safe square
  { col: 12, row: 6 },
  { col: 13, row: 6 },
  { col: 14, row: 6 },
  { col: 14, row: 7 }, // 38

  // Blue starting square and approach (39–51)
  { col: 14, row: 8 }, // 39 — Blue start
  { col: 13, row: 8 },
  { col: 12, row: 8 },
  { col: 11, row: 8 },
  { col: 10, row: 8 },
  { col: 9, row: 8  },
  { col: 8, row: 9  }, // 45
  { col: 8, row: 10 },
  { col: 8, row: 11 },
  { col: 8, row: 12 }, // 47 — safe square (Blue home entry – 3)
  { col: 8, row: 13 },
  { col: 8, row: 14 },
  { col: 7, row: 14 }, // 51
] as const;

// ─── Home Column Coordinates ──────────────────────────────────────────────────

/**
 * Render coordinates for each player's home column (indices 0–4).
 * Index 0 is the first square entered from the common path.
 * Index 4 leads to the center home.
 */
const HOME_COLUMN_COORDS: Record<PlayerColor, readonly RenderCoord[]> = {
  red: [
    { col: 7, row: 13 },
    { col: 7, row: 12 },
    { col: 7, row: 11 },
    { col: 7, row: 10 },
    { col: 7, row: 9  }, // index 4 — adjacent to center
  ],
  yellow: [
    { col: 1, row: 7  },
    { col: 2, row: 7  },
    { col: 3, row: 7  },
    { col: 4, row: 7  },
    { col: 5, row: 7  }, // index 4
  ],
  green: [
    { col: 7, row: 1  },
    { col: 7, row: 2  },
    { col: 7, row: 3  },
    { col: 7, row: 4  },
    { col: 7, row: 5  }, // index 4
  ],
  blue: [
    { col: 13, row: 7 },
    { col: 12, row: 7 },
    { col: 11, row: 7 },
    { col: 10, row: 7 },
    { col: 9,  row: 7 }, // index 4
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
  red: [
    { col: 1, row: 1 }, { col: 2, row: 1 },
    { col: 1, row: 2 }, { col: 2, row: 2 },
  ],
  yellow: [
    { col: 11, row: 1 }, { col: 12, row: 1 },
    { col: 11, row: 2 }, { col: 12, row: 2 },
  ],
  green: [
    { col: 1, row: 11 }, { col: 2, row: 11 },
    { col: 1, row: 12 }, { col: 2, row: 12 },
  ],
  blue: [
    { col: 11, row: 11 }, { col: 12, row: 11 },
    { col: 11, row: 12 }, { col: 12, row: 12 },
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
