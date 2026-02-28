'use client';

import { useCallback, useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { createInitialState, CLASSIC_MODE_DEFAULTS } from '../engine/state';
import { createRng } from '../engine/dice';
import { gameMachine } from './gameMachine';
import type { GameState } from '../engine/types';
import type { PendingAnimation } from '../components/composites/MoveAnimationLayer';

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
  machineState: string;
}

export function useGameState(): UseGameStateReturn {
  const initialState = useMemo(() => makeInitialState(), []);
  const initialRng = useMemo(() => createRng(SEED), []);

  const [state, send] = useMachine(gameMachine, {
    input: { gameState: initialState, rng: initialRng },
  });

  const { gameState, error } = state.context;

  const resetGame = useCallback(() => {
    send({ type: 'RESET_GAME' });
  }, [send]);

  return {
    gameState,
    pendingAnimation: null,
    rollDice: () => send({ type: 'ROLL_DICE' }),
    selectToken: (tokenId: string) => send({ type: 'SELECT_TOKEN', tokenId }),
    deselectToken: () => send({ type: 'DESELECT_TOKEN' }),
    commitMove: () => send({ type: 'COMMIT_MOVE' }),
    resetGame,
    onAnimationComplete: () => {},
    error,
    machineState: JSON.stringify(state.value),
  };
}
