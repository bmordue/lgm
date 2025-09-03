# Feature Proposal: Database Integration

## 1. Summary

This document proposes the integration of a persistent database to replace the current in-memory data storage system. This is a critical step towards production readiness, ensuring that game state, user data, and other critical information are not lost when the server restarts. We recommend using **PostgreSQL** for its robustness, flexibility, and strong community support.

## 2. Problem

The current API server uses an in-memory object (`api/service/Store.ts`) to store all application data, including created games, player information, and turn history. This approach has several critical limitations:

*   **Lack of Persistence:** All data is lost upon server restart, making it unsuitable for anything beyond temporary development and testing.
*   **Scalability Issues:** Storing all data in memory is not scalable. As the number of games and users grows, the server's memory consumption will become a bottleneck.
*   **Data Integrity:** In-memory storage lacks the transactional integrity and robustness of a dedicated database system.

This is marked as a high-priority item in the project `ROADMAP.md`.

## 3. Proposed Solution

We propose to replace the in-memory store with a **PostgreSQL** database. This will involve:

1.  **Introducing a Database ORM/Driver:** We will integrate a library like [Prisma](https://www.prisma.io/) or [TypeORM](https://typeorm.io/) to manage the database connection, schema migrations, and queries in a type-safe way. Prisma is a modern choice that works well with TypeScript.
2.  **Defining Data Models:** We will create formal data models for our core entities: `User`, `Game`, `Player`, `Actor`, `Turn`, and `Order`.
3.  **Refactoring Data Access:** The `Store.ts` service will be deprecated and replaced with a new data access layer that interacts with the PostgreSQL database.
4.  **Updating Services:** All services that currently depend on `Store.ts` will be updated to use the new data access layer.

## 4. Implementation Plan

### Step 1: Project Setup

1.  **Add Database Dependencies:** Add PostgreSQL driver (`pg`) and an ORM (e.g., `prisma`) to `api/package.json`.
    ```bash
    cd api
    npm install pg
    npm install prisma --save-dev
    ```
2.  **Initialize Prisma:** Set up the Prisma schema and client.
    ```bash
    npx prisma init --datasource-provider postgresql
    ```
    This will create a `prisma` directory with a `schema.prisma` file and a `.env` file for the database connection string.

### Step 2: Data Modeling

1.  **Define Schema:** Define the data models in `prisma/schema.prisma`. This will include models for `User`, `Game`, `Player`, `Actor`, etc., with appropriate relations.
    *   `Game` will have relations to `Player`s and `Turn`s.
    *   `Player` will have a relation to a `User` and `Actor`s.
    *   `Turn` will store the turn number and orders for that turn.

2.  **Database Migration:** Generate and apply the initial database migration.
    ```bash
    npx prisma migrate dev --name init
    ```

### Step 3: Refactor Data Access Layer

1.  **Create Database Service:** Create a new service, e.g., `api/service/DatabaseService.ts`, that initializes and exports the Prisma client instance.
2.  **Deprecate `Store.ts`:** Remove the `Store.ts` file.
3.  **Implement New Data Logic:** Create new services or update existing ones to replace the logic from `Store.ts`. For example, `GameService.ts` will now use the Prisma client to fetch and update game data.

    *   `GameService.createGame()` will now be an `async` function that performs a `prisma.game.create()` operation.
    *   `GameService.getGame()` will use `prisma.game.findUnique()`.

### Step 4: Update API Controllers and Services

1.  **Refactor `GameController.ts` and `UsersController.ts`:** Update the controllers to call the modified service methods. Since database operations are asynchronous, this will involve adding `async/await` throughout the call stack.
2.  **Refactor `GameLifecycleService.ts`, `TurnService.ts`, etc.:** Update all other services that relied on the in-memory store.

### Step 5: Testing

1.  **Update Unit Tests:** Modify existing unit tests in `api/test/` to mock the new database service layer.
2.  **Update E2E Tests:** Adjust end-to-end tests to account for a persistent state. This may require adding setup and teardown steps to ensure tests run against a clean database state.

## 5. Benefits

*   **Data Persistence:** Game state will be saved permanently.
*   **Improved Scalability:** The application will be able to handle a much larger amount of data.
*   **Enhanced Reliability:** We gain the benefits of database transactions and data integrity.
*   **Foundation for Future Features:** A proper database is a prerequisite for many other features, such as player statistics, leaderboards, and more complex game worlds.
