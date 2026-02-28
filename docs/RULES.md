# Ludo Game Rules and Features

## Overview
Ludo is a classic board game for 2-4 players where each player races their four tokens from start to finish according to die rolls.

**Default mode in this project is _Ludo Extra Mode_** (more aggressive + competitive). **Classic Ludo** is available as an optional “chill” ruleset.

## Core Rules

### Board Layout
- **Cross-shaped board** with 4 colored quadrants: Red, Yellow, Green, Blue
- **Starting areas (home)**: Each player has a corner base where tokens begin
- **Starting squares**: A colored square at the beginning of each player's path
- **Common path**: 52 squares that all players traverse
- **Home column**: 5 squares leading to the center home for each player
- **Center home**: The final destination where all tokens must reach

### Movement Rules

1. **Starting a Token**
   - A token can only leave the starting area when a player rolls a **6**
   - The token moves to the player's starting square

2. **General Movement**
   - Players roll a single 6-sided die
   - Move one token forward by the number rolled
   - Tokens move clockwise around the common path

3. **Rolling a 6**
   - Player gets an **additional roll** (bonus turn)
   - Can choose to move a new token out OR move an existing token 6 spaces
   - Maximum 3 consecutive 6s: if a player rolls three 6s in a row, the third 6 is cancelled

4. **Entering Home Column**
   - Tokens enter their colored home column when they reach their starting square again
   - Must roll the exact number needed to land on the center home square
   - Overshooting requires the token to move backwards or stay (variant rule)

### Capturing (Kicking)

- Landing on a square occupied by an opponent's token **captures** it
- Captured token returns to its starting area
- Capturing player gets a **bonus roll**
- **Safe squares**: Starting squares and certain marked squares protect tokens from capture

### Advanced Competitive Rules (Ludo Extra Mode)

1. **Territory Captures**
   - Tokens can be captured **anywhere on the board**, including inside colored home columns
   - **Caveat**: To exit a captured position in an opponent's home column, the token must roll a **6**
   - When exiting with a 6, the token moves back one tile down the home column, then continues normal movement

2. **Token Stacking**
   - When **2 or more tokens of the same color** occupy the same square, they form a **stack**
   - Stacked tokens can **only be captured together** (all tokens in the stack return to start)
   - Opponent must land on the exact square to capture the entire stack
   - Stacks provide strategic defensive positions

3. **Ransom System**
   - When a token is captured, it becomes a **prisoner** of the capturing player
   - To retrieve a captured token, the owner must roll a **6**
   - Rolling a 6 allows the player to either: (a) retrieve one prisoner token, OR (b) move a token out from start
   - Captured tokens are held by the capturer until ransomed

4. **Home Column Exit**
   - A token already in its home column can **exit back to the common path** by rolling a **6**
   - This allows aggressive players to chase opponents instead of finishing
   - Token exits to the home column entry square and can continue around the board
   - Strategic for blocking opponents or capturing vulnerable tokens

 #### Extra Mode Clarifications (to avoid confusion)
 - **Safe zones vs territory captures**
   - In **Classic**, safe zones protect tokens from capture.
   - In **Extra Mode**, territory captures apply everywhere; safe zones still exist visually, but they only provide **stacking convenience / meeting points**, not capture immunity (unless a custom rule says otherwise).
 - **Exact landing**
   - A capture only happens when a moving token **lands exactly** on the occupied square.
 - **Stacks**
   - A stack is **same-color only**.
   - If a stack is captured, **all tokens in the stack** go to start (or become prisoners if ransom is enabled).
 - **Ransom lifecycle**
   - When ransom is enabled, a captured token does **not** immediately return to start.
   - Captured tokens are stored as “prisoners” for the capturer until the owner rolls a **6** and chooses to retrieve one.
 - **Home column exit**
   - Exiting the home column with a 6 returns the token to the **home-column entry square** (the square where it entered the column).

### Safe Zones

- **Default behavior**
  - Player's **starting square** is always safe (cannot be captured on it)
  - **Star-marked squares** on the board are safe zones (cannot be captured on them)
  - Multiple tokens of the same or different players can occupy safe squares
- **When "Territory Captures" is toggled ON**
  - Safe squares lose their immunity and can be captured like any other square
  - This makes the game more aggressive and configurable per match

### Winning

- First player to get **all 4 tokens to the center home** wins
- Game can continue to determine 2nd, 3rd, and 4th place

### Time & Turn Rules (Recommended)

- **Turn timer** (for online): e.g. 20-30s per turn
- **AFK handling**: if timer expires, auto-play a valid move (or skip if none)
- **Reconnect grace**: short window to rejoin before AI takes over

## Game Features to Implement

### Core Gameplay
- [ ] 2-4 player support (local multiplayer)
- [ ] Turn-based dice rolling system
- [ ] Token movement logic with path validation
- [ ] Capturing mechanics
- [ ] Bonus roll system for 6s and captures
- [ ] Win condition detection

### Game Modes
- [ ] **Ludo Extra Mode (DEFAULT)** (advanced competitive rules with territory captures, stacking, ransom, home exit)
- [ ] Classic Ludo (standard rules, chill mode)
- [ ] Quick mode (fewer tokens per player, e.g., 2 tokens)
- [ ] Team mode (2v2 with partners sitting opposite)
- [ ] Ranked mode (competitive with ELO/points system)
- [ ] Tournament mode (bracket-style competitions)

### User Interface
- [ ] Interactive board visualization
- [ ] Token selection and movement
- [ ] Dice rolling animation
- [ ] Turn indicator
- [ ] Player color indicators
- [ ] Move history/log
- [ ] Contextual tooltips for rules ("Why can't I move?", "Why was I captured?")
- [ ] Quick emotes/taunts (non-toxic presets)
- [ ] End-of-game recap (captures, longest streak, clutch moments)

### Visual Features
- [ ] Animated token movements
- [ ] Dice roll animations
- [ ] Capture effects/animations
- [ ] Winning celebration
- [ ] Highlight valid moves
- [ ] Safe zone visual indicators
- [ ] Highlights for "threatened" tokens (can be captured next turn)
- [ ] Highlights for "capture paths" (who you can catch with current roll)

### Audio Features
- [ ] Dice roll sound
- [ ] Token move sound
- [ ] Capture sound
- [ ] Win celebration sound
- [ ] Background music

### AI Opponents (Optional)
- [ ] Easy AI (random valid moves)
- [ ] Medium AI (basic strategy)
- [ ] Hard AI (optimal pathfinding and capture priority)

### Online Multiplayer Features
- [ ] **Group invite system** (create/join private game rooms)
- [ ] Friend list and invite management
- [ ] **In-game voice chat** (audio call within game room)
- [ ] Text chat with emoji reactions
- [ ] Spectator mode for ongoing games
- [ ] Quick match (random opponent matching)
- [ ] Private rooms with custom rules
- [ ] Rematch flow + “run it back” option
- [ ] Clubs / Guilds (shared chat, club leaderboards)
- [ ] Party queue (matchmake as a group)

### Ranking & Progression System
- [ ] **Points-based ranking system**:
  - 1st place: +500 points
  - 2nd place: +250 points
  - 3rd place: +100 points
  - 4th place: +50 points
- [ ] **Local leaderboard** (friends/region)
- [ ] **Global leaderboard** (worldwide rankings)
- [ ] Player profiles with stats (win rate, total captures, games played)
- [ ] Rank tiers (Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster)
- [ ] Season-based rankings (monthly/quarterly resets)
- [ ] Placement matches for new players
- [ ] Smurf detection (flag rapid climbing accounts)

### Tournament System
- [ ] **Automated tournaments** for top-ranked players
- [ ] Tournament brackets (single/double elimination)
- [ ] Prize pools (virtual currency, exclusive perks)
- [ ] Tournament history and achievements
- [ ] Spectator mode for tournament matches
- [ ] Live tournament leaderboards
- [ ] Scheduled weekly events (fixed start times)
- [ ] Community tournaments (hosted by clubs)

### Power-Ups & Perks System
- [ ] **Level-based rewards** (unlock perks by accumulating points)
- [ ] **Capture Immunity** (1-turn protection from being captured)
- [ ] **Auto-Retrieval** (instantly retrieve captured token without rolling 6)
- [ ] **Dice Selection** (choose dice number once per game)
- [ ] **Double Move** (move two tokens in one turn)
- [ ] **Shield Token** (protect one token for 3 turns)
- [ ] **Teleport** (move token to any safe square)
- [ ] **Stack Breaker** (capture individual tokens from a stack)
- [ ] Perk cooldown system (prevent spam)
- [ ] In-game currency to purchase perks
- [ ] Daily login rewards and challenges
- [ ] Perk ruleset presets ("Casual perks", "Competitive perks")
- [ ] Perk bans in Ranked/Tournament (optional)

### Additional Features
- [ ] Game state save/load
- [ ] Comprehensive statistics tracking (games played, wins, captures, perks used)
- [ ] Rule variants toggle (e.g., must exact roll to enter home)
- [ ] Undo move (optional, casual mode only)
- [ ] Tutorial/help system with interactive guides
- [ ] Pause/resume functionality
- [ ] Replay system (watch previous games)
- [ ] Achievement system with badges
- [ ] Daily/weekly challenges for bonus points
- [ ] Customizable themes and token skins
- [ ] Seasonal content (boards, dice, tokens) tied to events
- [ ] Onboarding: interactive first-time experience for Extra rules
- [ ] Accessibility: color-blind mode, reduced motion, haptics toggles
- [ ] Highlight reels (auto-generate best moments from a match)
- [ ] Shareable match links / replay sharing (with privacy controls)
- [ ] Daily free reward wheel (cosmetic-only)
- [ ] Limited-time events (weekends) with special rule twists
- [ ] Player reporting + block list (for social safety)
- [ ] Push notifications (turn reminders, tournament start, friend invite)

## Rule Variants (Optional)

1. **Must-exact home entry**: Token must roll exact number to enter center; overshoot means token cannot move
2. **Double block**: Two tokens of same player on one square block that square for all players
3. **No bonus for 6**: Remove the extra roll for rolling a 6
4. **Three 6s penalty**: Rolling three 6s sends the moved token back to start
5. **Quick start**: Tokens start on the board, no need to roll 6 to begin

## Technical Considerations

### Core Game Engine
- Game state should track: player turns, token positions, dice values, move history, captured tokens, active perks
- Validate all moves server-side to prevent cheating
- Deterministic game logic for replay functionality
- Smooth animations with cancellable/resumable states

### Online Infrastructure
- WebSocket/real-time communication for live multiplayer
- Matchmaking system with skill-based matching
- Server-authoritative game state (prevent client-side manipulation)
- Disconnect/reconnect handling with grace period
- Game state persistence (Redis/database)
- Load balancing for concurrent games
- Turn timers + AFK policy enforcement (auto-move/auto-skip)
- Idempotent action processing (avoid duplicate moves on reconnect)

### Voice Chat System
- WebRTC for peer-to-peer audio communication
- Push-to-talk and always-on modes
- Voice activity detection
- Mute/unmute controls
- Audio quality settings

### Anti-Cheat & Security
- Server-side dice roll generation (cryptographically secure random)
- Move validation on every action
- Rate limiting to prevent spam
- Detect and penalize suspicious patterns
- Report system for toxic behavior
- Automated moderation for chat

### Ranking & Progression
- ELO-based matchmaking algorithm
- Point decay for inactive players
- Season rollover logic
- Leaderboard caching and optimization
- Achievement tracking system
- Fraud prevention for ranking (collusion detection, abnormal surrender patterns)

### Monetization (Optional)
- Free-to-play with optional cosmetics
- Battle pass system for seasonal rewards
- Premium currency for perks (balanced, not pay-to-win)
- Ad-supported free tier
- Subscription for ad-free + bonus perks

### Live Ops & Content
- Event scheduler (time-based rulesets + rewards)
- Content pipeline for cosmetics (themes, boards, dice, tokens)
- A/B testing support for balancing perks and rewards

### Analytics & Telemetry
- Track funnels (tutorial completion, match completion, churn)
- Track gameplay balance (win rates by perk usage, capture rates)
- Privacy-aware logging and retention controls

### Performance Optimization
- Efficient board state representation
- Minimize network payload size
- Client-side prediction for smooth UX
- Asset preloading and caching
- Mobile optimization (touch controls, battery efficiency)
