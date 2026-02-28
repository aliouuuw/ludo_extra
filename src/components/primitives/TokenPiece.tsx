/*
 * Purpose: Renders a single Ludo token piece on the board.
 * Variants: default, selectable, selected, opponent, home (finished)
 * Props:
 *   color           — player color
 *   status          — 'default' | 'selectable' | 'selected' | 'opponent' | 'home'
 *   onClick         — called when selectable token is clicked
 *   label           — accessible label (e.g. "Pion rouge 1")
 * States: default, selectable (highlighted ring), selected (elevated), opponent (dimmed), home (complete)
 * Usage: <TokenPiece color="red" status="selectable" onClick={onSelect} label="Pion rouge 1" />
 * Do not use when: rendering tokens in the start yard overview (use simplified variant)
 */

import type { PlayerColor } from '../../engine/types';

type TokenStatus = 'default' | 'selectable' | 'selected' | 'opponent' | 'home';

interface TokenPieceProps {
  color: PlayerColor;
  status?: TokenStatus;
  onClick?: () => void;
  label: string;
}

const PLAYER_COLOR_MAP: Record<PlayerColor, string> = {
  red: 'var(--color-player-red)',
  yellow: 'var(--color-player-yellow)',
  green: 'var(--color-player-green)',
  blue: 'var(--color-player-blue)',
};

export function TokenPiece({ color, status = 'default', onClick, label }: TokenPieceProps) {
  const isInteractive = status === 'selectable' || status === 'selected';
  const opacity = status === 'opponent' ? 0.55 : 1;

  const ringColor = status === 'selectable'
    ? 'var(--color-neutral-900)'
    : status === 'selected'
    ? 'var(--color-neutral-50)'
    : 'transparent';

  const scale = status === 'selected' ? 'scale(1.2)' : 'scale(1)';

  return (
    <button
      type="button"
      disabled={!isInteractive}
      onClick={isInteractive ? onClick : undefined}
      aria-label={label}
      aria-pressed={status === 'selected'}
      style={{
        width: '80%',
        height: '80%',
        borderRadius: 'var(--radius-full)',
        backgroundColor: PLAYER_COLOR_MAP[color],
        border: `2px solid ${ringColor}`,
        cursor: isInteractive ? 'pointer' : 'default',
        opacity,
        transform: scale,
        transition: `transform var(--motion-state-ms) ease, opacity var(--motion-state-ms) ease`,
        boxShadow: status === 'selected' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        outline: 'none',
        padding: 0,
        position: 'relative',
        zIndex: status === 'selected' ? 2 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onFocus={(e) => {
        if (isInteractive) {
          (e.currentTarget as HTMLElement).style.outline = '2px solid var(--color-neutral-900)';
          (e.currentTarget as HTMLElement).style.outlineOffset = '2px';
        }
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLElement).style.outline = 'none';
      }}
    >
      {status === 'home' && (
        <span
          aria-hidden="true"
          style={{
            fontSize: 'var(--text-caption)',
            color: 'var(--color-neutral-50)',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          ✓
        </span>
      )}
    </button>
  );
}
