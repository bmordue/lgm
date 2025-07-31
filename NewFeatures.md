# New Feature Ideas

Here are 3 feature ideas based on analysis of the repository:

1.  **Implement Player-Specific Fog of War:**
    *   **Description:** The ROADMAP.md mentions that the fog of war infrastructure exists but is currently disabled. This feature would involve implementing the logic to filter the game world view based on what each player's units can see. This is a common feature in strategy games that adds a layer of tactics and exploration.
    *   **Files to modify:**
        *   `api/service/GameService.ts`: Likely needs changes to filter game state data based on player visibility.
        *   `api/service/Visibility.ts`: This file might contain the existing (but disabled) fog of war logic. It would need to be enabled and potentially updated.
        *   `api/spec/api.yml`: The API response for game state might need to be updated to reflect player-specific views.
        *   `client/src/components/HexGrid.vue`: The frontend would need to render the game board according to the fog of war rules (e.g., hiding units or terrain in unexplored areas).
    *   **Justification:** This is explicitly mentioned in the ROADMAP as a desired feature ("Fog of War: Infrastructure exists but disabled – implement player-specific world filtering"). It enhances gameplay by adding an element of surprise and strategic decision-making.

2.  **Enhance Player Management for Joining Games:**
    *   **Description:** The README.md and ROADMAP.md both point out issues with player management, specifically around joining games. This feature would involve:
        *   Allowing the game creator (owner) to set a maximum player limit for a game.
        *   Enforcing this limit when players try to join.
        *   Preventing a user from joining the same game multiple times with the same session.
    *   **Files to modify:**
        *   `api/service/GameService.ts`: Logic for creating games would need to store the `maxPlayers` limit. Logic for joining games would need to check against this limit and prevent duplicate joins.
        *   `api/controllers/GameController.ts`: Endpoints for creating and joining games would need to handle the new `maxPlayers` parameter and enforce joining rules.
        *   `api/spec/api.yml`: The `createGame` operation might need a new parameter for `maxPlayers`. The `joinGame` operation might need updated error responses for "game full" or "already joined".
        *   `client/src/views/DashboardView.vue` or a new game creation view: UI for setting `maxPlayers` when creating a game.
        *   `client/src/stores/Games.store.ts`: Frontend store might need to handle the `maxPlayers` property.
    *   **Justification:** This addresses items explicitly listed in both the README ("owner sets player limit is set when game is created", "should limit number of players in a game", "cannot join twice with the same user session") and the ROADMAP ("Player Management: Fix game joining limits, prevent duplicate joins, add host permissions"). It's a fundamental aspect of managing multiplayer game sessions.

3.  **Implement Database Integration for Game State Persistence:**
    *   **Description:** The ROADMAP.md lists "Database Integration: Replace in-memory storage to persist game state" as a medium priority task. This feature would involve replacing the current in-memory data store with a persistent database (e.g., PostgreSQL, MongoDB, or a simple file-based store like SQLite for initial implementation). This would allow game states to survive server restarts and be more robust.
    *   **Files to modify:**
        *   `api/service/Store.ts`: This file likely handles the current in-memory storage. It would need to be refactored to interact with a database.
        *   `api/service/GameService.ts`: Methods that interact with `Store.ts` would need to be updated to handle asynchronous database operations (if not already).
        *   `api/package.json`: Add database client libraries as dependencies.
        *   Configuration files (new or existing): To store database connection details.
        *   Potentially new files for database schema migrations.
    *   **Justification:** This is a critical step towards making the game production-ready, as mentioned in the ROADMAP. In-memory storage is fine for development and testing, but not for a live game where data persistence is essential.
