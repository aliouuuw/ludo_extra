# Progress

## Overview
Ludo Extra is a browser-playable Ludo implementation where the default ruleset is "Ludo Extra Mode" (aggressive/competitive). Classic Ludo is supported as an optional ruleset.

## Functional Groups
- Foundation
- Game Engine
- Board & Visuals
- Game UI
- AI & Local Play
- Online & Social (future)

## Milestone Ordering
- Foundation (tokens + primitives + patterns)
- Deterministic game engine
- Board rendering + interaction
- Game shell + dice + move selection
- Recap + local AI

## Assumptions
- Initial delivery targets offline/local play.
- Extra Mode features are configurable per match.
- Deterministic replay format is a first-class requirement.

## Decisions

**Design Direction**
- UI uses monochromatic neutral base (grays, near-black primary)
- Player colors (red/yellow/green/blue) used for tokens, turn indicators, and player-specific UI only
- This ensures UI chrome works with all player colors without clashing

**Avatar System**
- PlayerAvatar component uses lutteurs images as fallback for unauthenticated users
- Available lutteurs: balla-gueye, eumeu-sene, franc, modou-lo
- When authentication is added, will use profile images as primary

**PWA Strategy**
- PWA-first approach: installable, offline-capable, native-like experience
- Custom install prompt after first game completion (not browser default)
- Service worker caches all static assets including lutteurs images
- Target: Lighthouse PWA score > 90

**Localization**
- French is the primary UI language
- Copy constants structured in src/copy/index.ts with French strings
- English can be added as secondary language later via i18next

**Rule Defaults (Confirmed)**
- Overshooting into center home: token **stays** (does not bounce backward)
- Extra Mode default: **Territory Captures ON** (safe squares lose immunity)
- Ransom toggle OFF: capture sends token **immediately to start** (classic behavior)

**Best Approach for Ludo App**
- Board-first screen hierarchy: Board is primary, HUD elements secondary
- Mobile-first responsive design (touch-optimized, 44x44px min touch targets)
- Transform/opacity-only animations for smooth 60fps on mobile
- Foundation tasks prioritized: tokens → primitives → composites → patterns → features

## Completed Tasks

### 2025-02-28 — foundation-01b: Create UI primitives (Button, Text, IconButton)

**Status:** Complete
**Design Gate:** ✅ Passed (no gaps flagged)

**What was built:**
- `Text` primitive with 8 typography variants (caption through display), color options, and truncation support
- `Button` primitive with 4 variants (primary/secondary/ghost/danger), 3 sizes, loading state, full keyboard accessibility
- `IconButton` primitive for icon-only actions, same variants/sizes, keyboard accessible
- `src/components/primitives/index.ts` barrel export
- Added `@keyframes spin` to globals.css for loading spinners

**States implemented:**
- Button: default, hover, active, focus, disabled, loading
- IconButton: same interactive states

**Components created:** Text, Button, IconButton

**Dependencies added:** lucide-react@0.575.0

**Key design decisions:**
- All components use CSS variables from tokens.css (no raw values)
- Interactive states use 150ms motion-state-ms transition
- Buttons have min-height (32px/40px/48px) for consistent touch targets
- Focus states use outline with 2px offset (accessible)
- Loading state renders spinner + disabled cursor

**Type-check:** ✅ Pass (tsc --noEmit)

---

### 2025-02-28 — foundation-01c: Create composite UI components (Card, Modal, Tooltip)

**Status:** Complete
**Design Gate:** ✅ Passed (no gaps flagged)

**What was built:**
- `Card` component with 4 elevation levels (none/sm/md/lg), hover elevation lift, configurable padding
- `Modal` component with focus trap, Escape to close, body scroll lock, click-outside to close, 3 sizes
- `Tooltip` component with hover/focus triggers, 4 positions (top/bottom/left/right), configurable delay
- `src/components/composites/index.ts` barrel export

**Accessibility features:**
- Modal: focus trap cycles through focusable elements, returns focus to trigger on close, aria-modal="true"
- Tooltip: shows on focus for keyboard users, aria-hidden when not visible
- Card: role="button" when clickable, visible focus outline

**Design system compliance:**
- Card: shadow-sm default, radius-lg, elevation hover states
- Modal: shadow-lg, radius-lg, 200ms entrance animation (transform/opacity only)
- Tooltip: shadow-md, radius-md, neutral-800 background

**Type-check:** ✅ Pass (tsc --noEmit)

---

### 2025-02-28 — foundation-02: Build shared pattern components (EmptyState, ErrorState, LoadingState, ConfirmDialog, Toast)

**Status:** Complete
**Design Gate:** ✅ Passed (no gaps flagged)

**What was built:**
- `EmptyState` — Icon, title, description, optional primary/secondary actions
- `ErrorState` — Error icon, title, description, optional retry action, secondary action
- `LoadingState` — Spinner variant, skeleton-card, skeleton-list, skeleton generic with pulse animation
- `ConfirmDialog` — Uses Modal, supports default/destructive variants, confirm/cancel actions
- `Toast` — 4 variants (success/error/warning/info), auto-dismiss, manual dismiss, ToastContainer for positioning
- `src/components/patterns/index.ts` barrel export
- Added `@keyframes pulse` to globals.css

**Accessibility features:**
- EmptyState: role="status" for screen readers
- ErrorState: role="alert" for error announcements
- LoadingState: role="status" with aria-live="polite"
- ConfirmDialog: Uses Modal accessibility (focus trap, aria-modal)
- Toast: role="status", aria-live="polite", ToastContainer with aria-label

**Design system compliance:**
- All use semantic color tokens (error, success, warning, info)
- Consistent spacing with --space-* tokens
- Shadows from token scale
- Border radius from token scale

**Type-check:** ✅ Pass (tsc --noEmit)

---

## Verification Pass (2025-02-28)

**Scope:** Re-verified all completed tasks before moving to next priority.

### foundation-01 — Design system tokens + copy constants
- All ACs confirmed passing.
- Found: task was never marked `"status": "completed"` in prd.json — fixed.

### foundation-01b — UI primitives (Button, Text, IconButton)
- All ACs confirmed passing.
- Minor finding: `Button` uses inline ternary for `minHeight` values instead of named constants. Non-blocking.

### foundation-01c — Composites (Card, Modal, Tooltip)
- All ACs confirmed passing. Focus trap, Escape handling, and token compliance verified.

### foundation-02 — Pattern components
- All ACs confirmed passing. All 5 components verified with correct ARIA roles and variants.

### foundation-03 — PWA manifest + service worker scaffolding
- Manifest valid, VitePWA configured, service worker scaffolded.
- Found: `public/icons/` contained only a README — all 10 PNG icon files were missing, causing manifest references to 404.
- Fix: Created `scripts/gen-icons.ts` and generated all 10 placeholder PNGs (valid 8-bit RGB PNG, dark background with white "L" logo mark). Confirmed valid via `file` command.
- Lighthouse AC remains unverifiable until a production build is run, but the missing-icon blocker is resolved.

**Decision:** `scripts/gen-icons.ts` kept in repo as a utility to regenerate icons when real branding assets are ready.

---

### 2025-02-28 — engine-01: Define game state model and invariants for Classic + Extra rules

**Status:** Complete
**Time:** ~1 cycle

**What was built:**
- `src/engine/constants.ts` — named constants: `BOARD_SQUARE_COUNT` (52), `HOME_COLUMN_LENGTH` (5), `MAX_CONSECUTIVE_SIXES` (3), `STARTING_SQUARE` per color, `HOME_ENTRY_SQUARE` per color, `SAFE_SQUARES`
- `src/engine/types.ts` — all TypeScript types: `PlayerColor`, `DiceValue`, `GameMode`, `GameStatus`, `TurnPhase`, `MoveType`, `TokenPosition`, `Token`, `Player`, `DiceRoll`, `MoveLogEntry`, `Prisoner`, `RuleToggles`, `TurnState`, `MatchMetadata`, `GameState`, `ActionErrorCode`, `ValidationResult`
- `src/engine/invariants.ts` — `isValidPosition`, `validateGameState` (I1–I11), `assertValidState`
- `src/engine/state.ts` — `EXTRA_MODE_DEFAULTS`, `CLASSIC_MODE_DEFAULTS`, `createInitialState` factory
- `src/engine/index.ts` — barrel export

**States implemented:** N/A (non-UI task)

**Design decisions:**
- `TokenPosition` is a discriminated union (`start | board | home_column | home`) for exhaustive switch handling at every move site
- `prisoners` array is always present in `GameState`; invariant I8 enforces it is empty when `rules.ransom === false` — satisfies the AC directly
- `ActionErrorCode` type defined here so UI and engine share the same vocabulary from day one (avoids string literals scattered across the codebase)
- `assertValidState` is a no-op in production; active in dev/test
- `STARTING_SQUARE` and `HOME_ENTRY_SQUARE` defined in `constants.ts`, shared with board-01 for render coordinate mapping

**Assumptions made:**
- Home column has 5 squares (index 0–4); token at index 4 transitions to zone `home` on exact landing
- Standard Ludo layout: Red=0, Yellow=13, Green=26, Blue=39 — board-01 will validate against render grid
- `createInitialState` places tokens at `zone: 'start'` unless `quickStart` is enabled, in which case tokens start at `STARTING_SQUARE[color]`

**Type-check:** ✅ Pass (tsc --noEmit, exit 0)

---

### 2025-02-28 — engine-02: Implement deterministic dice roll and bonus-roll rules

**Status:** Complete
**Time:** ~1 cycle

**What was built:**
- `src/engine/dice.ts` — `createRng` (Mulberry32 seeded RNG), `rollDice`, `updateConsecutiveSixes`, `bonusRollsFromDice`
- `Rng` interface with `next()` and `state()` for snapshot/replay support
- `dice.ts` added to barrel export in `index.ts`

**Design decisions:**
- Mulberry32 chosen: fast, seedable, 32-bit, no external deps — ideal for deterministic replay
- `rollDice` encodes both the third-6 cancellation and `noBonusSix` rule in one place — single source of truth
- `rngSnapshot` captures the RNG state *before* the roll so a replay can fast-forward to any point without re-running from the start
- `updateConsecutiveSixes` takes prior count explicitly to keep the function pure (no hidden state)

**Assumptions made:**
- Replay reconstruction re-seeds the RNG from `metadata.seed` and replays the action log; individual `rngSnapshot` values are checkpoints for debugging, not required for full replay

**Type-check:** ✅ Pass (tsc --noEmit, exit 0)

---

### 2025-02-28 — engine-03: Implement movement and path validation (Classic rules)

**Status:** Complete
**Time:** ~1 cycle

**What was built:**
- `src/engine/movement.ts` — `computeDestination`, `isTokenMoveable`, `getSelectableTokenIds`, `isSamePosition`
- Private helpers: `advanceBoardSquare`, `stepsToHomeEntry`, `resolveHomeColumnLanding`
- `movement.ts` added to barrel export

**Design decisions:**
- `computeDestination` returns `TokenPosition | null` — null means "no valid landing" (overshoot-stay, already home, start without 6). Callers treat null as unmoveable.
- `resolveHomeColumnLanding` centralizes all home-column edge cases: exact landing → `home`, overshoot-stay → same position (filtered as no-op), overshoot-bounce → bounce back from center.
- `stepsToHomeEntry` uses modular arithmetic so it works regardless of the token's current lap position.
- `getSelectableTokenIds` filters out overshoot-stay no-ops via `isSamePosition` check.

**Assumptions made:**
- Bounce overshoot below home_column index 0 is clamped at 0; home column exit back onto board is Extra Mode only (engine-05)
- Capture filtering added in engine-04; `getSelectableTokenIds` here covers movement legality only

**Type-check:** ✅ Pass (tsc --noEmit, exit 0)

---

