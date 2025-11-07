# Feature Proposal: Real-time Game Updates with WebSockets

## 1. Summary

This document proposes the implementation of a real-time communication layer using WebSockets to provide instant game state updates to clients. This will replace the current need for clients to poll the server repeatedly, leading to a more responsive, efficient, and interactive user experience. We recommend using the [Socket.IO](https://socket.io/) library for its ease of use, robustness, and automatic fallback mechanisms.

## 2. Problem

Currently, the frontend client has no way of knowing when the game state has changed on the server unless it actively requests the latest data. This is typically done via HTTP polling, where the client sends requests to the API at a fixed interval (e.g., every few seconds). This approach has several disadvantages:

*   **Latency:** Updates are not instant. A player might have to wait several seconds after another player's turn is processed to see the results.
*   **Inefficiency:** Polling creates unnecessary network traffic and server load, as many requests will return no new data.
*   **Poor User Experience:** The game can feel sluggish and unresponsive, which is detrimental for a multiplayer game.

The `ROADMAP.md` identifies this as a medium-priority item under "Real-time Updates" and "WebSocket Support".

## 3. Proposed Solution

We propose to integrate **Socket.IO** into both the API server and the Vue.js client to enable real-time, bidirectional communication.

1.  **Server-Side (API):** The API server will run a Socket.IO server. It will emit events to clients whenever a relevant game state change occurs.
2.  **Client-Side (Vue):** The frontend client will establish a WebSocket connection to the server. It will listen for server-emitted events and update its state and UI accordingly, without needing to poll.
3.  **Event-Driven Architecture:** We will define a clear set of WebSocket events for key game actions. For example:
    *   `game:update`: Sent to all players in a game when the game state changes (e.g., a turn is processed).
    *   `game:player_joined`: Sent when a new player joins a game.
    *   `notification`: A generic event for sending messages or notifications to a player.

## 4. Implementation Plan

### Step 1: Project Setup

1.  **Add Server Dependencies:** Add `socket.io` to `api/package.json`.
    ```bash
    cd api
    npm install socket.io
    ```
2.  **Add Client Dependencies:** Add the client library to `client/package.json`.
    ```bash
    cd client
    npm install socket.io-client
    ```

### Step 2: Server-Side Implementation

1.  **Initialize Socket.IO Server:** In `api/index.ts`, initialize a Socket.IO server and attach it to the existing HTTP server.
2.  **Create `WebSocketService.ts`:** Create a new `api/service/WebSocketService.ts` to manage the WebSocket logic. This service will:
    *   Export the initialized Socket.IO server instance.
    *   Provide helper functions to emit events to specific rooms or clients (e.g., `emitToGame(gameId, event, data)`).
    *   Handle connection and disconnection logic.
3.  **Use Game Rooms:** Use Socket.IO's "room" feature to group clients by the game they are in. When a client connects, they will join a room named `game-${gameId}`. This makes it easy to broadcast events to all players in a specific game.

### Step 3: Integrate with Game Logic

1.  **Emit Events from Services:** Modify the existing services to emit WebSocket events at key points.
    *   In `GameLifecycleService.ts`, after a new player successfully joins a game, emit a `game:player_joined` event to the corresponding game room.
    *   In `TurnService.ts`, after a turn has been processed, emit a `game:update` event to the game room with the new game state.
    *   In `GameService.ts`, when a new game is created, the creator's socket can be made to join the new game room.

### Step 4: Client-Side Implementation

1.  **Create WebSocket Plugin/Store:** In the client, create a new store or a Vue plugin to manage the Socket.IO connection. This module will:
    *   Establish a connection to the server when the application loads.
    *   Expose methods for joining and leaving game rooms (`socket.emit('join_game', { gameId })`).
2.  **Listen for Events:** In the relevant Vue components or stores (e.g., `GameView.vue`, `Games.store.ts`), listen for WebSocket events.
    *   When the client receives a `game:update` event, it should update its local game state in the Pinia store. This will automatically trigger the UI to re-render with the new data.
    *   When a `notification` event is received, it could be displayed to the user as a toast message.
3.  **Remove Polling Logic:** Remove any existing `setInterval` or other polling mechanisms from the client codebase.

## 5. Benefits

*   **Instant Updates:** Players see changes in the game state immediately, creating a much more dynamic and engaging experience.
*   **Reduced Server Load:** Eliminates constant polling requests, reducing CPU and network overhead on the server.
*   **Improved Efficiency:** Data is only sent when there is an actual update, which is more efficient for both the client and the server.
*   **Foundation for Live Features:** Opens the door for other real-time features, such as live chat within a game or notifications.
