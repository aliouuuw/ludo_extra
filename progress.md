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

