import { describe, it, expect } from '@jest/globals';
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
    it('should transition to AWAITING_MOVE (or AWAITING_COMMIT) after roll', () => {
      const state = createTestState();
      // Seed 12345 produces a 6 on the first roll with this RNG.
      // With the new deduplication logic, all 4 tokens in start yard
      // are deduplicated to 1. Since validMoveTokenIds.length === 1,
      // the reducer auto-selects it and goes to AWAITING_COMMIT.
      const rng = createRng(12345);

      const result = applyAction(state, { type: 'ROLL_DICE', rng });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.state.turn.phase).toBe('AWAITING_COMMIT');
        expect(result.state.turn.selectedTokenId).not.toBeNull();
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
    it('should select a token when multiple are available', () => {
      // To test SELECT_TOKEN, we need a state where AWAITING_MOVE is reached.
      // This happens if we roll a 6, bring a token out, and then roll another 6.
      const state = createTestState();
      
      // Force token p1's first token onto the board so we have multiple choices on next 6
      state.players[0].tokens[0].position = { zone: 'board', square: 0 };
      
      // Need an RNG that rolls a 6
      let seed = 0;
      let rollResult;
      while (seed < 1000) {
        const rng = createRng(seed);
        rollResult = applyAction(state, { type: 'ROLL_DICE', rng });
        if (rollResult.ok && rollResult.state.turn.diceResult?.value === 6) {
          break;
        }
        seed++;
      }

      if (!rollResult?.ok) return;

      // Now we should have 2 options: move the board token, or start a new yard token
      expect(rollResult.state.turn.phase).toBe('AWAITING_MOVE');
      expect(rollResult.state.turn.validMoveTokenIds.length).toBeGreaterThan(1);

      // Get first valid token
      const validTokenId = rollResult.state.turn.validMoveTokenIds[0];

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
      const rng = createRng(12345); // Rolls 6

      // Roll
      const rollResult = applyAction(state, { type: 'ROLL_DICE', rng });
      if (!rollResult.ok) return;

      // With deduplication, rolling a 6 with all 4 tokens in start yard
      // results in validMoveTokenIds.length === 1, so it auto-selects and
      // goes straight to AWAITING_COMMIT.
      // So we don't need to manually select a token for this test.
      
      // Commit
      const commitResult = applyAction(rollResult.state, {
        type: 'COMMIT_MOVE',
      });

      expect(commitResult.ok).toBe(true);
      if (commitResult.ok) {
        expect(commitResult.state.turn.phase).toBe('AWAITING_ROLL');
        expect(commitResult.state.turn.selectedTokenId).toBeNull();
      }
    });

    it('should not commit without selection', () => {
      // Need a scenario where multiple tokens are valid, so the reducer
      // stays in AWAITING_MOVE and doesn't auto-select.
      const state = createTestState();
      state.players[0].tokens[0].position = { zone: 'board', square: 0 };
      
      let seed = 0;
      let rollResult;
      while (seed < 1000) {
        const rng = createRng(seed);
        rollResult = applyAction(state, { type: 'ROLL_DICE', rng });
        if (rollResult.ok && rollResult.state.turn.diceResult?.value === 6) {
          break;
        }
        seed++;
      }
      if (!rollResult?.ok) return;

      // Phase is AWAITING_MOVE because we have a token on board AND a token in yard.
      // No token is selected yet.
      const commitResult = applyAction(rollResult.state, {
        type: 'COMMIT_MOVE',
      });

      // Should fail because WRONG_PHASE (AWAITING_MOVE != AWAITING_COMMIT)
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
