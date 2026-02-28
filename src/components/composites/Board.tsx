/*
 * Purpose: Renders the full 15×15 Ludo cross board with tokens at their logical positions.
 * Variants: active (game in progress), empty (pre-game tokens in yards)
 * Props:
 *   gameState         — current GameState
 *   onTokenSelect     — called with tokenId when a selectable token is clicked
 *   onTokenDeselect   — called when selected token is clicked again
 * States:
 *   empty:   All tokens in start yards, board grid visible, no selectables
 *   error:   Board mapping validation failed — renders ErrorState
 *   success: Active match, tokens at correct positions, selectables highlighted
 * Usage: <Board gameState={state} onTokenSelect={handleSelect} onTokenDeselect={handleDeselect} />
 * Do not use when: showing a replay overview (use a read-only snapshot variant)
 */

import React, { useMemo, useRef } from 'react';
import { getRenderCoord, validateBoardMapping, getCommonPath, getHomeColumnCoords, isFixedSafeSquare, getSquareColor, CENTER_HOME_COORD } from '../../engine/board';
import type { GameState, PlayerColor, Token, TokenPosition } from '../../engine/types';
import { STARTING_SQUARE } from '../../engine/constants';
import { BoardSquare } from '../primitives/BoardSquare';
import { TokenPiece } from '../primitives/TokenPiece';
import { ErrorState } from '../patterns/ErrorState';
import { MoveAnimationLayer } from './MoveAnimationLayer';
import type { PendingAnimation } from './MoveAnimationLayer';

interface BoardProps {
  gameState: GameState;
  onTokenSelect: (tokenId: string) => void;
  onTokenDeselect: () => void;
  onPreSelectToken: (tokenId: string) => void;
  pendingAnimation?: PendingAnimation | null;
  onAnimationComplete?: () => void;
}

const PLAYER_COLORS: PlayerColor[] = ['red', 'yellow', 'green', 'blue'];

const YARD_COORDS: Record<PlayerColor, { col: number; row: number; colSpan: number; rowSpan: number }> = {
  red:    { col: 0, row: 0,  colSpan: 6, rowSpan: 6 },
  yellow: { col: 9, row: 0,  colSpan: 6, rowSpan: 6 },
  blue:   { col: 0, row: 9,  colSpan: 6, rowSpan: 6 },
  green:  { col: 9, row: 9,  colSpan: 6, rowSpan: 6 },
};

const PLAYER_BG: Record<PlayerColor, string> = {
  red:    'rgba(220,38,38,0.12)',
  yellow: 'rgba(234,179,8,0.12)',
  green:  'rgba(22,163,74,0.12)',
  blue:   'rgba(37,99,235,0.12)',
};

function isBoardMappingValid(): boolean {
  try {
    validateBoardMapping();
    return true;
  } catch {
    return false;
  }
}

type TokenWithStatus = Token & {
  status: 'default' | 'selectable' | 'selected' | 'opponent' | 'home';
};

export function Board({
  gameState,
  onTokenSelect,
  onTokenDeselect,
  onPreSelectToken,
  pendingAnimation = null,
  onAnimationComplete = () => {},
}: BoardProps) {
  const mappingValid = useMemo(() => isBoardMappingValid(), []);
  const boardRef = useRef<HTMLDivElement>(null);

  if (!mappingValid) {
    return (
      <ErrorState
        title="Erreur de plateau"
        description="La configuration du plateau est invalide. Veuillez recharger la page."
        onRetry={() => window.location.reload()}
      />
    );
  }

  const { players, turn } = gameState;
  const activePlayerId = turn.activePlayerId;
  const selectedTokenId = turn.selectedTokenId;
  const preSelectedTokenId = turn.preSelectedTokenId;
  const validMoveTokenIds = new Set(turn.validMoveTokenIds);
  const phase = turn.phase;

  // Build enriched token list with status
  const allTokens: TokenWithStatus[] = players.flatMap((player) =>
    player.tokens.map((token): TokenWithStatus => {
      const isActive = player.id === activePlayerId;
      if (token.position.zone === 'home') {
        return { ...token, status: 'home' };
      }
      // Post-roll selection (AWAITING_MOVE/AWAITING_COMMIT)
      if (selectedTokenId === token.id) {
        return { ...token, status: 'selected' };
      }
      if (isActive && validMoveTokenIds.has(token.id)) {
        return { ...token, status: 'selectable' };
      }
      // Pre-roll selection (AWAITING_ROLL)
      if (preSelectedTokenId === token.id) {
        return { ...token, status: 'selected' };
      }
      if (phase === 'AWAITING_ROLL' && isActive && 
          (token.position.zone === 'board' || token.position.zone === 'home_column')) {
        return { ...token, status: 'selectable' };
      }
      if (!isActive) {
        return { ...token, status: 'opponent' };
      }
      return { ...token, status: 'default' };
    })
  );

  // Group tokens by their rendered grid position key for stacking
  const tokensByCoordKey = new Map<string, TokenWithStatus[]>();
  for (const token of allTokens) {
    const coord = getRenderCoord(token.position, token.color, token.index);
    const key = `${coord.col}:${coord.row}`;
    const existing = tokensByCoordKey.get(key) ?? [];
    existing.push(token);
    tokensByCoordKey.set(key, existing);
  }

  // Build the set of common path squares for grid rendering
  const commonPath = getCommonPath();
  const startingSquares = new Set(Object.values(STARTING_SQUARE));

  const GRID_SIZE = 15;

  // Build a lookup for home column cells: coordKey → PlayerColor
  const homeColumnCellColor = useMemo(() => {
    const map = new Map<string, PlayerColor>();
    for (const color of PLAYER_COLORS) {
      for (const coord of getHomeColumnCoords(color)) {
        map.set(`${coord.col}:${coord.row}`, color);
      }
    }
    return map;
  }, []);

  // Determine which cells are "corridor" cells (not yard, not empty background)
  // Yards occupy the four 6×6 corners; corridor cells are everything else
  function isYardCell(col: number, row: number): boolean {
    return (
      (col <= 5 && row <= 5) ||   // red
      (col >= 9 && row <= 5) ||   // yellow
      (col <= 5 && row >= 9) ||   // blue
      (col >= 9 && row >= 9)      // green
    );
  }

  function getYardColorForCell(col: number, row: number): PlayerColor | null {
    if (col <= 5 && row <= 5) return 'red';
    if (col >= 9 && row <= 5) return 'yellow';
    if (col <= 5 && row >= 9) return 'blue';
    if (col >= 9 && row >= 9) return 'green';
    return null;
  }

  // Render grid cells
  const cells: React.ReactNode[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const coordKey = `${col}:${row}`;
      const tokensHere = tokensByCoordKey.get(coordKey) ?? [];

      const isCenterZone = col >= 6 && col <= 8 && row >= 6 && row <= 8;
      const isCenterHome = col === CENTER_HOME_COORD.col && row === CENTER_HOME_COORD.row;

      if (isCenterZone) {
        cells.push(
          <BoardSquare
            key={coordKey}
            col={col}
            row={row}
            isCenterZone
            isCenterHome={isCenterHome}
          >
            {isCenterHome
              ? tokensHere.map((token) => (
                  <TokenPiece
                    key={token.id}
                    color={token.color}
                    status={token.status}
                    label={`Pion ${token.color} ${token.index + 1} — arrivée`}
                  />
                ))
              : null}
          </BoardSquare>
        );
        continue;
      }

      if (isYardCell(col, row)) {
        const yardColor = getYardColorForCell(col, row)!;
        cells.push(
          <div
            key={coordKey}
            style={{
              gridColumn: col + 1,
              gridRow: row + 1,
              backgroundColor: PLAYER_BG[yardColor],
              border: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            role="cell"
            aria-label={`Cour ${yardColor}`}
          >
            {tokensHere.map((token) => {
              const handleClick = 
                token.status === 'selectable' && phase === 'AWAITING_ROLL'
                  ? () => onPreSelectToken(token.id)
                  : token.status === 'selectable'
                  ? () => onTokenSelect(token.id)
                  : token.status === 'selected' && phase === 'AWAITING_ROLL'
                  ? () => onPreSelectToken(token.id) // Click again to change selection
                  : token.status === 'selected'
                  ? () => onTokenDeselect()
                  : undefined;
              
              return (
                <TokenPiece
                  key={token.id}
                  color={token.color}
                  status={token.status}
                  label={`Pion ${token.color} ${token.index + 1} — départ`}
                  onClick={handleClick}
                />
              );
            })}
          </div>
        );
        continue;
      }

      // Common path or home column cell
      const squareIndex = commonPath.findIndex((c) => c.col === col && c.row === row);
      const onCommonPath = squareIndex !== -1;
      const isSafe = onCommonPath && isFixedSafeSquare(squareIndex);
      const homeColColor = homeColumnCellColor.get(coordKey) ?? null;
      const squarePlayerColor = onCommonPath ? getSquareColor(squareIndex) : homeColColor;
      const showMarker = onCommonPath && startingSquares.has(squareIndex);

      cells.push(
        <BoardSquare
          key={coordKey}
          col={col}
          row={row}
          isSafe={isSafe}
          playerColor={squarePlayerColor}
          showMarker={showMarker}
        >
          {tokensHere.map((token) => {
            const handleClick = 
              token.status === 'selectable' && phase === 'AWAITING_ROLL'
                ? () => onPreSelectToken(token.id)
                : token.status === 'selectable'
                ? () => onTokenSelect(token.id)
                : token.status === 'selected' && phase === 'AWAITING_ROLL'
                ? () => onPreSelectToken(token.id) // Click again to change selection
                : token.status === 'selected'
                ? () => onTokenDeselect()
                : undefined;
            
            return (
              <TokenPiece
                key={token.id}
                color={token.color}
                status={token.status}
                label={`Pion ${token.color} ${token.index + 1}`}
                onClick={handleClick}
              />
            );
          })}
        </BoardSquare>
      );
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 'min(90vw, 90vh)',
        margin: '0 auto',
      }}
    >
      <div
        ref={boardRef}
        role="grid"
        aria-label="Plateau de Ludo"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(15, 1fr)',
          gridTemplateRows: 'repeat(15, 1fr)',
          width: '100%',
          aspectRatio: '1',
          border: '2px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          backgroundColor: 'var(--color-neutral-50)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            gridColumn: '7 / span 3',
            gridRow: '7 / span 3',
            position: 'relative',
            zIndex: 0,
            pointerEvents: 'none',
            background:
              'conic-gradient(from -45deg, var(--color-player-yellow) 0deg 90deg, var(--color-player-green) 90deg 180deg, var(--color-player-blue) 180deg 270deg, var(--color-player-red) 270deg 360deg)',
            opacity: 0.6,
          }}
        />
        {cells}
      </div>
      <MoveAnimationLayer
        animation={pendingAnimation}
        boardRef={boardRef}
        onComplete={onAnimationComplete}
      />
    </div>
  );
}
