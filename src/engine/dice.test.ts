import { describe, it, expect } from 'vitest';
import { createRng, rollDice, bonusRollsFromDice } from './dice';
import { MAX_CONSECUTIVE_SIXES } from './constants';
import type { DiceValue } from './types';

describe('dice', () => {
  describe('createRng', () => {
    it('should create a seeded RNG', () => {
      const rng = createRng(12345);
      expect(rng).toHaveProperty('next');
      expect(rng).toHaveProperty('state');
    });

    it('should produce deterministic sequence with same seed', () => {
      const rng1 = createRng(12345);
      const rng2 = createRng(12345);

      const rolls1 = [rng1.next(), rng1.next(), rng1.next()];
      const rolls2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(rolls1).toEqual(rolls2);
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = createRng(12345);
      const rng2 = createRng(67890);

      const roll1 = rng1.next();
      const roll2 = rng2.next();

      expect(roll1).not.toBe(roll2);
    });

    it('should have state that can be resumed', () => {
      const rng1 = createRng(12345);
      const roll1 = rng1.next();
      const state = rng1.state();

      const rng2 = createRng(state);
      const roll2 = rng2.next();

      expect(roll1).toBe(roll2);
    });
  });

  describe('rollDice', () => {
    it('should return a value between 1 and 6', () => {
      const rng = createRng(12345);
      const result = rollDice(rng, 0, { noBonusSix: false });

      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(6);
    });

    it('should grant bonus on roll of 6', () => {
      // Seed that produces a 6 first
      const rng = createRng(1664525);
      let foundSix = false;
      let attempts = 0;

      while (!foundSix && attempts < 1000) {
        const testRng = createRng(1664525 + attempts);
        const result = rollDice(testRng, 0, { noBonusSix: false });

        if (result.value === 6 && !result.canceled) {
          expect(result.bonusGranted).toBe(true);
          foundSix = true;
        }
        attempts++;
      }

      expect(foundSix).toBe(true);
    });

    it('should not grant bonus when noBonusSix rule is active', () => {
      const rng = createRng(1664525);

      const result = rollDice(rng, 0, { noBonusSix: true });

      expect(result.bonusGranted).toBe(false);
    });

    it('should cancel third consecutive 6', () => {
      // Find a seed that produces three 6s in a row
      let foundTripleSix = false;

      for (let seed = 0; seed < 10000; seed++) {
        const rng = createRng(seed);
        const roll1 = rollDice(rng, 0, { noBonusSix: false });

        if (roll1.value === 6 && roll1.bonusGranted) {
          const roll2 = rollDice(rng, 1, { noBonusSix: false });

          if (roll2.value === 6 && roll2.bonusGranted) {
            const roll3 = rollDice(rng, 2, { noBonusSix: false });

            if (roll3.canceled) {
              expect(roll3.value).toBe(6);
              expect(roll3.bonusGranted).toBe(false);
              foundTripleSix = true;
              break;
            }
          }
        }
      }

      expect(foundTripleSix).toBe(true);
    });
  });

  describe('bonusRollsFromDice', () => {
    it('should return 1 for non-canceled 6', () => {
      const roll = {
        value: 6 as DiceValue,
        canceled: false,
        bonusGranted: true,
        rngSnapshot: 12345,
      };

      expect(bonusRollsFromDice(roll)).toBe(1);
    });

    it('should return 0 for canceled 6', () => {
      const roll = {
        value: 6 as DiceValue,
        canceled: true,
        bonusGranted: false,
        rngSnapshot: 12345,
      };

      expect(bonusRollsFromDice(roll)).toBe(0);
    });

    it('should return 0 for rolls 1-5', () => {
      for (let i = 1; i <= 5; i++) {
        const roll = {
          value: i as DiceValue,
          canceled: false,
          bonusGranted: false,
          rngSnapshot: 12345,
        };

        expect(bonusRollsFromDice(roll)).toBe(0);
      }
    });
  });
});
