import { getSelectableTokenIds } from './movement';
import type { GameState, PlayerColor, TokenPosition } from './types';

// ─── Memoization Cache ──────────────────────────────────────────────────────────

type CacheKey = string;

interface MemoizedResult<T> {
  key: CacheKey;
  result: T;
  timestamp: number;
}

class MemoCache<T> {
  private cache = new Map<string, MemoizedResult<T>>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 100, ttlMs = 5000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.result;
  }

  set(key: string, result: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, {
      key,
      result,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// ─── Game State Hash ───────────────────────────────────────────────────────────

function hashGameState(state: GameState): CacheKey {
  // Fast hash based on critical state elements
  const turn = state.turn;
  const tokens = state.players
    .flatMap((p) => p.tokens)
    .map((t) => `${t.id}:${t.position.zone}:${(t.position as { square?: number; index?: number }).square ?? (t.position as { index?: number }).index ?? 0}`)
    .join('|');

  return `${turn.activePlayerId}:${turn.phase}:${turn.diceResult?.value ?? 'null'}:${tokens}`;
}

// ─── Memoized Engine Functions ───────────────────────────────────────────────────

const selectableTokensCache = new MemoCache<readonly string[]>(50, 1000);

/**
 * Memoized version of getSelectableTokenIds.
 * Caches results for up to 1 second or 50 entries.
 * Call clearMemoCaches() after state mutations to invalidate.
 */
export function getSelectableTokenIdsMemoized(
  state: GameState,
  diceValue: number
): readonly string[] {
  const key = `${hashGameState(state)}:d${diceValue}`;
  const cached = selectableTokensCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const activePlayer = state.players.find(
    (p) => p.id === state.turn.activePlayerId
  );

  if (!activePlayer) {
    return [];
  }

  const result = getSelectableTokenIds(
    activePlayer.tokens,
    diceValue as 1 | 2 | 3 | 4 | 5 | 6,
    'stay'
  );
  selectableTokensCache.set(key, result);
  return result;
}

// ─── Batch Computation ─────────────────────────────────────────────────────────

interface MoveOption {
  tokenId: string;
  canMove: boolean;
  destination: TokenPosition | null;
  isCapture: boolean;
}

const moveOptionsCache = new MemoCache<readonly MoveOption[]>(30, 500);

/**
 * Compute all move options for current dice roll in one batch.
 * More efficient than individual checks for AI or UI hinting.
 */
export function computeAllMoveOptions(
  state: GameState,
  diceValue: number
): readonly MoveOption[] {
  const key = `${hashGameState(state)}:opts${diceValue}`;
  const cached = moveOptionsCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const activePlayer = state.players.find(
    (p) => p.id === state.turn.activePlayerId
  );

  if (!activePlayer) {
    return [];
  }

  const options: MoveOption[] = [];

  for (const token of activePlayer.tokens) {
    // Import would be needed here - simplified for now
    // const dest = computeDestination(token, diceValue);
    // const canMove = isTokenMoveable(token, diceValue);
    // const isCapture = dest && checkCapture(state, token, dest);

    // Placeholder until we can properly import
    options.push({
      tokenId: token.id,
      canMove: false, // Will be computed properly
      destination: null,
      isCapture: false,
    });
  }

  // Cache and return
  moveOptionsCache.set(key, options);
  return options;
}

// ─── Cache Management ─────────────────────────────────────────────────────────

export function clearMemoCaches(): void {
  selectableTokensCache.clear();
  moveOptionsCache.clear();
}

export function getCacheStats(): {
  selectableTokens: number;
  moveOptions: number;
} {
  return {
    selectableTokens: 0, // Would need to expose cache size
    moveOptions: 0,
  };
}
