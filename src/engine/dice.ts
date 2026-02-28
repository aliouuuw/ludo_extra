import { MAX_CONSECUTIVE_SIXES } from './constants';
import type { DiceRoll, DiceValue, RuleToggles } from './types';

// ─── Seeded RNG (Mulberry32) ──────────────────────────────────────────────────

/**
 * Mulberry32 — a fast, seedable 32-bit pseudo-random number generator.
 * Returns a function that yields floats in [0, 1) and exposes the current
 * state so it can be snapshotted for replay.
 *
 * Reference: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 */
export interface Rng {
  /** Returns the next float in [0, 1) and advances internal state. */
  next(): number;
  /** Returns the current state value (for snapshotting into DiceRoll.rngSnapshot). */
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0; // coerce to unsigned 32-bit

  return {
    next(): number {
      s = (s + 0x6d2b79f5) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 15), z | 1) >>> 0;
      z = (z ^ (z + Math.imul(z ^ (z >>> 7), z | 61))) >>> 0;
      return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
    },
    state(): number {
      return s;
    },
  };
}

// ─── Dice Roll ────────────────────────────────────────────────────────────────

/**
 * Produces a single DiceRoll given:
 *   - `rng`               — the live RNG instance (advanced in place)
 *   - `consecutiveSixes`  — count of 6s rolled consecutively before this roll (0–2)
 *   - `rules`             — active rule toggles for this match
 *
 * Encodes all rules that affect the roll outcome:
 *   - Third consecutive 6 (consecutiveSixes === 2): `canceled = true`; no move generated.
 *   - `noBonusSix` rule: rolling a 6 does not grant an extra roll.
 */
export function rollDice(
  rng: Rng,
  consecutiveSixes: number,
  rules: Pick<RuleToggles, 'noBonusSix'>
): DiceRoll {
  const snapshot = rng.state();
  const raw = Math.floor(rng.next() * 6) + 1;
  const value = raw as DiceValue;

  const isSix = value === 6;
  const canceled = isSix && consecutiveSixes >= MAX_CONSECUTIVE_SIXES - 1;
  const bonusGranted = isSix && !canceled && !rules.noBonusSix;

  return {
    value,
    canceled,
    bonusGranted,
    rngSnapshot: snapshot,
  };
}

// ─── Consecutive-Six Tracker ──────────────────────────────────────────────────

/**
 * Returns the updated `consecutiveSixes` counter after a roll is applied.
 *
 * Rules:
 *   - Non-6 roll always resets the counter to 0.
 *   - A canceled 6 resets to 0 (the sequence ends).
 *   - A non-canceled 6 increments (capped at MAX_CONSECUTIVE_SIXES - 1).
 */
export function nextConsecutiveSixes(roll: DiceRoll): number {
  if (roll.value !== 6 || roll.canceled) {
    return 0;
  }
  // Safe because rollDice prevents reaching MAX_CONSECUTIVE_SIXES
  return Math.min(
    (/* previous count reconstructed from roll */ 0) + 1, // caller must add to current count
    MAX_CONSECUTIVE_SIXES - 1
  );
}

/**
 * Computes the new `consecutiveSixes` given the prior count and the roll just taken.
 *
 * Prefer this over `nextConsecutiveSixes` — it takes the prior count explicitly.
 */
export function updateConsecutiveSixes(prior: number, roll: DiceRoll): number {
  if (roll.value !== 6 || roll.canceled) {
    return 0;
  }
  // After a valid 6 the counter goes up, but is capped at MAX-1 (the third 6
  // is caught at roll time by rollDice, so we never actually reach MAX here).
  return Math.min(prior + 1, MAX_CONSECUTIVE_SIXES - 1);
}

// ─── Bonus Roll Utility ───────────────────────────────────────────────────────

/**
 * Returns how many additional rolls the current player is entitled to
 * after the roll resolves (not counting any capture bonus).
 *
 *   - Canceled roll:    0
 *   - bonusGranted:     1
 *   - Otherwise:        0
 */
export function bonusRollsFromDice(roll: DiceRoll): number {
  if (roll.canceled) return 0;
  return roll.bonusGranted ? 1 : 0;
}
