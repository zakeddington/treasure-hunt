# Copilot Instructions for Treasure Hunt

## Architecture Overview
This is a real-time multiplayer web game using **Express + Socket.IO**. The architecture is straightforward:
- **Server** ([server.js](server.js)): Centralized game state machine managing phases (lobby/playing/roundOver), player scores, and treasure spawning
- **Client** ([public/client.js](public/client.js)): Renders UI and handles user interactions, receives state updates via Socket.IO events
- **State synchronization**: Server broadcasts state to all clients on changes; clients emit events (join, start, tapTreasure) back to server

The game loop:
1. Players join in lobby → 2+ players click Start → server spawns treasure at random position
2. Treasure visible for 60s; first tap wins 1 point
3. 10 rounds total, then returns to lobby
4. Scores persist across rounds within a game session

## Key Patterns & Conventions

### Server State Machine
The single source of truth is `state` object in server.js with phases and derived data:
- **Phase transitions**: "lobby" → "playing" → "roundOver" → back to lobby (via `scheduleNextRound()`)
- **Safeguards**: All Socket.IO handlers check `state.phase` before allowing actions; invalid state transitions are silently ignored (e.g., "start" only works in lobby)
- **Timers**: 60s round timeout and 1.5s inter-round delay managed via `setTimeout(); make sure timer IDs aren't stored — compare treasure.id instead

### Client-Server Communication
- **Emit pattern**: Client sends: `join` (name), `start`, `reset`, `tapTreasure` (treasureId)
- **Broadcast pattern**: Server emits `state` to all clients on every change; clients reconstruct UI reactively
- **Toast notifications**: One-off messages emitted directly to socket (e.g., "Need at least 2 players")

### Responsive Positioning
Treasure coordinates are **normalized (0–1)** in both x and y:
- Server generates: `rand(0.12, 0.88)` (x), `rand(0.18, 0.82)` (y) — margins avoid edges
- Client converts to pixels: `treasure.x * rect.width`, using `Math.min(rect.width, rect.height)` for sizing
- **Window resize**: No special handling needed; next `state` broadcast re-places treasure if still active

### HTML/CSS Structure
- **Semantic elements**: Use `<button>` for interactive treasure; all buttons have `aria-label`
- **Classes**: `.card`, `.arena`, `.treasure`, `.scoreItem`, `.hidden` — fully defined in [public/style.css](public/style.css)
- **Data binding**: IDs on elements (e.g., `id="banner"`) correspond to `el()` helper in client.js
- **CSS variables**: Color scheme defined in `:root` (`--bg`, `--card`, `--text`, etc.); use for consistent theming

## Development Workflow

### Start the server
```bash
npm install
npm start          # or npm run dev (with nodemon auto-reload)
```
Server runs on `http://localhost:3000`; any port via `PORT=8080 npm start`

### Testing the game
- Open same URL in multiple browser tabs/windows (simulate players)
- Or use phone + computer on same Wi-Fi (game designed for multi-device)
- Check server logs for `console.log` statements (state, timer triggers)

## Common Modifications

### Adding game mechanics
- Update `state` shape → update `broadcastState()` to include new fields
- Add Socket.IO handlers in `io.on("connection")` block → emit state changes
- Client updates: Add listeners for `state` event to derive UI updates

### Styling changes
- Global colors/fonts: Edit `:root` in style.css
- Layout: Grid system in `.layout`; media query handles mobile
- Avoid hardcoded dimensions; use CSS variables and relative sizing

### Security notes
- HTML escaping: Use `escapeHtml()` for all user-generated content (player names)
- Input validation: Server sanitizes names to 16 chars; client-side validation is UI only
- No auth: Single-process, local-network game; production deployment would need session management

## File Reference
- **[server.js](server.js)**: Game logic, state management, Socket.IO handlers
- **[public/client.js](public/client.js)**: UI rendering, event listeners, localStorage for player name
- **[public/index.html](public/index.html)**: DOM structure (topbar, cards, scoreboard, arena)
- **[public/style.css](public/style.css)**: Layout, theming, responsive design
- **[package.json](package.json)**: Dependencies (express, socket.io), scripts
