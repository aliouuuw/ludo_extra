import { describe, it, expect } from 'vitest';
import { createInitialState, CLASSIC_MODE_DEFAULTS } from './state';
import { applyAction } from './reducer';
import { createRng } from './dice';
import type { GameState } from './types';

function createTestState(): GameState {
  return createInitialState({
    id: 'test-game',
    seed: 12345,
    mode: 'classic',
    players: [
      { id: 'p1', name: 'Red', color: 'red', isAI: false },
      { id: 'p2', name: 'Yellow', color: 'yellow', isAI: false },
    ],
    tokensPerPlayer: 4,
    rules: CLASSIC_MODE_DEFAULTS,
  });
}

describe('reducer', () => {
  describe('ROLL_DICE', () => {
    it('should transition to AWAITING_MOVE after roll', () => {
      const state = createTestState();
      const rng = createRng(12345);

      const result = applyAction(state, { type: 'ROLL_DICE', rng });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.state.turn.phase).toBe('AWAITING_MOVE');
        expect(result.state.turn.diceResult).not.toBeNull();
      }
    });

    it('should not allow roll in wrong phase', () => {
      const state = createTestState();
      const rng = createRng(12345);

      // First roll
      const result1 = applyAction(state, { type: 'ROLL_DICE', rng });
      if (!result1.ok) return;

      // Second roll without committing
      const result2 = applyAction(result1.state, { type: 'ROLL_DICE', rng });

      expect(result2.ok).toBe(false);
    });
  });

  describe('SELECT_TOKEN', () => {
    it('should select a token', () => {
      const state = createTestState();
      const rng = createRng(12345);

      // Roll first
      const rollResult = applyAction(state, { type: 'ROLL_DICE', rng });
      if (!rollResult.ok) return;

      // Get first valid token
      const validTokenId = rollResult.state.turn.validMoveTokenIds[0];
      if (!validTokenId) return;

      const selectResult = applyAction(rollResult.state, {
        type: 'SELECT_TOKEN',
        tokenId: validTokenId,
      });

      expect(selectResult.ok).toBe(true);
      if (selectResult.ok) {
        expect(selectResult.state.turn.selectedTokenId).toBe(validTokenId);
        expect(selectResult.state.turn.phase).toBe('AWAITING_COMMIT');
      }
    });

    it('should not select invalid token', () => {
      const state = createTestState();

      const result = applyAction(state, {
        type: 'SELECT_TOKEN',
        tokenId: 'invalid-token',
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('COMMIT_MOVE', () => {
    it('should commit a move', () => {
      const state = createTestState();
      const rng = createRng(12345);

      // Roll
      const rollResult = applyAction(state, { type: 'ROLL_DICE', rng });
      if (!rollResult.ok) return;

      // Select token
      const validTokenId = rollResult.state.turn.validMoveTokenIds[0];
      if (!validTokenId) return;

      const selectResult = applyAction(rollResult.state, {
        type: 'SELECT_TOKEN',
        tokenId: validTokenId,
      });
      if (!selectResult.ok) return;

      // Commit
      const commitResult = applyAction(selectResult.state, {
        type: 'COMMIT_MOVE',
      });

      expect(commitResult.ok).toBe(true);
      if (commitResult.ok) {
        expect(commitResult.state.turn.phase).toBe('AWAITING_ROLL');
        expect(commitResult.state.turn.selectedTokenId).toBeNull();
      }
    });

    it('should not commit without selection', () => {
      const state = createTestState();
      const rng = createRng(12345);

      // Roll but don't select
      const rollResult = applyAction(state, { type: 'ROLL_DICE', rng });
      if (!rollResult.ok) return;

      const commitResult = applyAction(rollResult.state, {
        type: 'COMMIT_MOVE',
      });

      expect(commitResult.ok).toBe(false);
    });
  });

  describe('bonus rolls', () => {
    it('should grant bonus roll after rolling 6', () => {
      // Find a seed that produces a 6
      let seed = 0;
      let state = createTestState();
      let rollResult;

      while (seed < 10000) {
        const rng = createRng(seed);
        rollResult = applyAction(state, { type: 'ROLL_DICE', rng });
        if (rollResult.ok && rollResult.state.turn.diceResult?.value === 6) {
          break;
        }
        seed++;
      }

      expect(rollResult?.ok).toBe(true);
      if (rollResult?.ok) {
        expect(rollResult.state.turn.bonusRollsRemaining).toBeGreaterThan(0);
      }
    });
  });
});
