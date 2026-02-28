/*
 * Purpose: Renders a single square on the 15×15 Ludo board grid.
 * Variants: default, safe, starting (per player color), center-home
 * Props:
 *   col, row        — grid position (0-indexed)
 *   isSafe          — render safe-square marker
 *   playerColor     — tints the square for starting squares; null for neutral
 *   isCenterHome    — renders the center home diamond
 *   children        — tokens rendered inside
 * States: default, safe, starting, center-home
 * Usage: <BoardSquare col={6} row={14} isSafe={false} playerColor="red" />
 * Do not use when: rendering yard areas (handled by Board directly)
 */

import type { PlayerColor } from '../../engine/types';

interface BoardSquareProps {
  col: number;
  row: number;
  isSafe?: boolean;
  playerColor?: PlayerColor | null;
  isCenterHome?: boolean;
  children?: React.ReactNode;
}

const PLAYER_COLOR_MAP: Record<PlayerColor, string> = {
  red: 'var(--color-player-red)',
  yellow: 'var(--color-player-yellow)',
  green: 'var(--color-player-green)',
  blue: 'var(--color-player-blue)',
};

const PLAYER_SUBTLE_MAP: Record<PlayerColor, string> = {
  red: 'rgba(220, 38, 38, 0.15)',
  yellow: 'rgba(234, 179, 8, 0.15)',
  green: 'rgba(22, 163, 74, 0.15)',
  blue: 'rgba(37, 99, 235, 0.15)',
};

export function BoardSquare({
  col,
  row,
  isSafe = false,
  playerColor = null,
  isCenterHome = false,
  children,
}: BoardSquareProps) {
  const bg = isCenterHome
    ? 'var(--color-neutral-900)'
    : playerColor
    ? PLAYER_SUBTLE_MAP[playerColor]
    : 'var(--color-neutral-100)';

  return (
    <div
      style={{
        gridColumn: col + 1,
        gridRow: row + 1,
        backgroundColor: bg,
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        aspectRatio: '1',
      }}
      role="cell"
      aria-label={
        isCenterHome
          ? 'Centre'
          : playerColor
          ? `Case départ ${playerColor}`
          : isSafe
          ? 'Case sûre'
          : undefined
      }
    >
      {isSafe && !playerColor && !isCenterHome && (
        <span
          aria-hidden="true"
          style={{
            fontSize: 'var(--text-caption)',
            color: 'var(--color-neutral-400)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          ★
        </span>
      )}
      {playerColor && !isCenterHome && (
        <span
          aria-hidden="true"
          style={{
            width: '40%',
            height: '40%',
            borderRadius: 'var(--radius-full)',
            backgroundColor: PLAYER_COLOR_MAP[playerColor],
            opacity: 0.4,
            pointerEvents: 'none',
          }}
        />
      )}
      {children}
    </div>
  );
}
