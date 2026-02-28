/*
 * Purpose: Renders an animated token clone that slides between board squares
 *          and plays capture/home-arrival effects. Sits as an absolute overlay
 *          above the Board grid; does not affect layout.
 * Variants: move, capture, arrive-home
 * Props:
 *   animation       — current pending animation descriptor, or null
 *   boardRef        — ref to the Board's grid container (for coordinate measurement)
 *   onComplete      — called when the animation finishes
 * States: idle (null animation), moving, capturing, arriving-home
 * Usage: <MoveAnimationLayer animation={pending} boardRef={ref} onComplete={onDone} />
 * Do not use when: rendering a static replay snapshot.
 */

import { useEffect, useRef, useState } from 'react';
import type { PlayerColor } from '../../engine/types';
import type { RenderCoord } from '../../engine/board';

// ─── Animation Descriptor ─────────────────────────────────────────────────────

export type AnimationType = 'move' | 'capture' | 'arrive-home';

export interface PendingAnimation {
  type: AnimationType;
  color: PlayerColor;
  /** Source grid coord (col/row) for 'move'; ignored for 'capture'/'arrive-home' */
  from?: RenderCoord;
  /** Destination grid coord */
  to: RenderCoord;
  label: string;
}

// ─── CSS Injection ────────────────────────────────────────────────────────────

const KEYFRAMES_ID = 'ludo-animation-keyframes';

function injectKeyframes(): void {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @media (prefers-reduced-motion: no-preference) {
      @keyframes ludo-capture-flash {
        0%   { opacity: 1; transform: scale(1); }
        40%  { opacity: 0.9; transform: scale(1.35); }
        100% { opacity: 0; transform: scale(0.4); }
      }
      @keyframes ludo-home-pulse {
        0%   { opacity: 1; transform: scale(1); }
        50%  { opacity: 1; transform: scale(1.4); }
        100% { opacity: 1; transform: scale(1); }
      }
    }
    @media (prefers-reduced-motion: reduce) {
      @keyframes ludo-capture-flash {
        0%   { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes ludo-home-pulse {
        0%   { opacity: 1; }
        100% { opacity: 1; }
      }
    }
  `;
  document.head.appendChild(style);
}

// ─── Player Color Map ─────────────────────────────────────────────────────────

const PLAYER_COLOR_MAP: Record<PlayerColor, string> = {
  red:    'var(--color-player-red)',
  yellow: 'var(--color-player-yellow)',
  green:  'var(--color-player-green)',
  blue:   'var(--color-player-blue)',
};

// ─── Coordinate Helper ────────────────────────────────────────────────────────

/**
 * Converts a grid RenderCoord to pixel position within the board container.
 * The board is a 15×15 CSS grid — each cell is containerSize / 15.
 */
function coordToPx(
  coord: RenderCoord,
  containerSize: number
): { x: number; y: number } {
  const cellSize = containerSize / 15;
  return {
    x: coord.col * cellSize + cellSize / 2,
    y: coord.row * cellSize + cellSize / 2,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MoveAnimationLayerProps {
  animation: PendingAnimation | null;
  boardRef: React.RefObject<HTMLDivElement | null>;
  onComplete: () => void;
}

interface AnimatingState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: PlayerColor;
  type: AnimationType;
  label: string;
  cellSize: number;
}

export function MoveAnimationLayer({ animation, boardRef, onComplete }: MoveAnimationLayerProps) {
  const [animating, setAnimating] = useState<AnimatingState | null>(null);
  const animRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    injectKeyframes();
  }, []);

  useEffect(() => {
    if (!animation || !boardRef.current) {
      setAnimating(null);
      return;
    }

    const rect = boardRef.current.getBoundingClientRect();
    const containerSize = Math.min(rect.width, rect.height);
    const cellSize = containerSize / 15;

    const to = coordToPx(animation.to, containerSize);
    const from = animation.from
      ? coordToPx(animation.from, containerSize)
      : to;

    setAnimating({
      x: from.x,
      y: from.y,
      targetX: to.x,
      targetY: to.y,
      color: animation.color,
      type: animation.type,
      label: animation.label,
      cellSize,
    });
  }, [animation, boardRef]);

  // Trigger CSS transition and fire onComplete when it ends
  useEffect(() => {
    if (!animating || !animRef.current) return;

    const el = animRef.current;

    // Start at 'from' position, then transition to 'target'
    el.style.transform = `translate(${animating.x - animating.cellSize / 2}px, ${animating.y - animating.cellSize / 2}px)`;

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (animating.type === 'move') {
          el.style.transform = `translate(${animating.targetX - animating.cellSize / 2}px, ${animating.targetY - animating.cellSize / 2}px)`;
        }
      });
    });

    const handleEnd = () => {
      onCompleteRef.current();
      setAnimating(null);
    };

    el.addEventListener('transitionend', handleEnd, { once: true });
    el.addEventListener('animationend', handleEnd, { once: true });

    // Fallback: force complete after max animation duration
    const FALLBACK_MS = 400;
    const fallbackId = setTimeout(() => {
      onCompleteRef.current();
      setAnimating(null);
    }, FALLBACK_MS);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(fallbackId);
      el.removeEventListener('transitionend', handleEnd);
      el.removeEventListener('animationend', handleEnd);
    };
  }, [animating]);

  if (!animating) return null;

  const tokenSize = animating.cellSize * 0.72;

  const style: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: tokenSize,
    height: tokenSize,
    borderRadius: 'var(--radius-full)',
    backgroundColor: PLAYER_COLOR_MAP[animating.color],
    boxShadow: 'var(--shadow-md)',
    pointerEvents: 'none',
    zIndex: 10,
    willChange: 'transform, opacity',
    ...(animating.type === 'move'
      ? {
          transition: 'transform var(--motion-entrance-ms) ease-out',
          transform: `translate(${animating.x - tokenSize / 2}px, ${animating.y - tokenSize / 2}px)`,
        }
      : animating.type === 'capture'
      ? {
          transform: `translate(${animating.targetX - tokenSize / 2}px, ${animating.targetY - tokenSize / 2}px)`,
          animation: 'ludo-capture-flash 150ms ease forwards',
        }
      : {
          // arrive-home
          transform: `translate(${animating.targetX - tokenSize / 2}px, ${animating.targetY - tokenSize / 2}px)`,
          animation: 'ludo-home-pulse 200ms ease',
        }),
  };

  return (
    <div
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
      aria-hidden="true"
    >
      <div ref={animRef} style={style} role="presentation" aria-label={animating.label} />
    </div>
  );
}
