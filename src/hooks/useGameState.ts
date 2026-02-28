'use client';

import { useState, useCallback, useRef } from 'react';
import { createInitialState, CLASSIC_MODE_DEFAULTS } from '../engine/state';
import { applyAction } from '../engine/reducer';
import { createRng } from '../engine/dice';
import { getRenderCoord } from '../engine/board';
import type { GameState } from '../engine/types';
import type { PendingAnimation } from '../components/composites/MoveAnimationLayer';

// ─── Hook ──────────────────────────────────────────────────────────────────────

const SEED = Date.now();

function makeInitialState(): GameState {
  return createInitialState({
    id: `game-${SEED}`,
    seed: SEED,
    mode: 'classic',
    players: [
      { id: 'p1', name: 'Rouge', color: 'red',    isAI: false },
      { id: 'p2', name: 'Jaune', color: 'yellow', isAI: false },
      { id: 'p3', name: 'Vert',  color: 'green',  isAI: false },
      { id: 'p4', name: 'Bleu',  color: 'blue',   isAI: false },
    ],
    tokensPerPlayer: 4,
    rules: CLASSIC_MODE_DEFAULTS,
  });
}

export interface UseGameStateReturn {
  gameState: GameState;
  pendingAnimation: PendingAnimation | null;
  rollDice: () => void;
  selectToken: (tokenId: string) => void;
  deselectToken: () => void;
  commitMove: () => void;
  resetGame: () => void;
  onAnimationComplete: () => void;
  error: string | null;
}

export function useGameState(): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState>(makeInitialState);
  const [pendingAnimation, setPendingAnimation] = useState<PendingAnimation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rngRef = useRef(createRng(SEED));

  const dispatch = useCallback((action: Parameters<typeof applyAction>[1]) => {
    setGameState((prev) => {
      const result = applyAction(prev, action);
      if (!result.ok) {
        setError(result.message);
        return prev;
      }
      setError(null);
      return result.state;
    });
  }, []);

  const rollDice = useCallback(() => {
    // Re-seed rng from current rng state each roll for determinism
    const rng = createRng(rngRef.current.state());
    rngRef.current = rng;
    dispatch({ type: 'ROLL_DICE', rng });
  }, [dispatch]);

  const selectToken = useCallback((tokenId: string) => {
    setGameState((prev) => {
      // Find prev position for animation start
      const player = prev.players.find((p) => p.tokens.some((t) => t.id === tokenId));
      const token = player?.tokens.find((t) => t.id === tokenId);
      if (token && prev.turn.diceResult) {
        // We'll animate after commit; for now just select
      }
      const result = applyAction(prev, { type: 'SELECT_TOKEN', tokenId });
      if (!result.ok) {
        setError(result.message);
        return prev;
      }
      setError(null);
      return result.state;
    });
  }, []);

  const deselectToken = useCallback(() => {
    // Re-roll is not a thing; just go back to awaiting move by re-selecting nothing
    // In our reducer SELECT_TOKEN is idempotent on re-selection, so we can't "unselect"
    // The simplest UX: clicking selected token again does nothing (stay in AWAITING_COMMIT)
    // For testing we won't block this.
  }, []);

  const commitMove = useCallback(() => {
    setGameState((prev) => {
      // Capture before/after positions for animation
      const selectedId = prev.turn.selectedTokenId;
      const activePlayer = prev.players.find((p) => p.id === prev.turn.activePlayerId);
      const token = activePlayer?.tokens.find((t) => t.id === selectedId);
      const fromCoord = token ? getRenderCoord(token.position, token.color, token.index) : null;

      const result = applyAction(prev, { type: 'COMMIT_MOVE' });
      if (!result.ok) {
        setError(result.message);
        return prev;
      }

      // Find token in new state for destination
      const nextToken = result.state.players
        .flatMap((p) => p.tokens)
        .find((t) => t.id === selectedId);

      if (fromCoord && nextToken && selectedId) {
        const toCoord = getRenderCoord(nextToken.position, nextToken.color, nextToken.index);
        // Determine animation type
        const lastLog = result.state.moveLog[result.state.moveLog.length - 1];
        const animType =
          lastLog?.type === 'CAPTURE' ? 'capture'
          : lastLog?.type === 'FINISH' ? 'arrive-home'
          : 'move';

        setPendingAnimation({
          type: animType,
          color: nextToken.color,
          from: fromCoord,
          to: toCoord,
          label: `Déplacement pion ${nextToken.color} ${nextToken.index + 1}`,
        });
      }

      setError(null);
      return result.state;
    });
  }, []);

  const onAnimationComplete = useCallback(() => {
    setPendingAnimation(null);
  }, []);

  const resetGame = useCallback(() => {
    const seed = Date.now();
    rngRef.current = createRng(seed);
    setGameState(
      createInitialState({
        id: `game-${seed}`,
        seed,
        mode: 'classic',
        players: [
          { id: 'p1', name: 'Rouge', color: 'red',    isAI: false },
          { id: 'p2', name: 'Jaune', color: 'yellow', isAI: false },
          { id: 'p3', name: 'Vert',  color: 'green',  isAI: false },
          { id: 'p4', name: 'Bleu',  color: 'blue',   isAI: false },
        ],
        tokensPerPlayer: 4,
        rules: CLASSIC_MODE_DEFAULTS,
      })
    );
    setPendingAnimation(null);
    setError(null);
  }, []);

  return {
    gameState,
    pendingAnimation,
    rollDice,
    selectToken,
    deselectToken,
    commitMove,
    resetGame,
    onAnimationComplete,
    error,
  };
}
