# Feature Proposal: Enhanced Authentication and User Management

## 1. Summary

This document proposes a significant enhancement to the authentication and user management system. The current implementation is a placeholder and lacks the security and features required for a production application. We propose implementing a complete authentication system, including user registration with hashed passwords and a session management system using JSON Web Tokens (JWT).

## 2. Problem

The current user system, as seen in `api/controllers/UsersController.ts`, is a simple placeholder. It allows creating a user session with just a username, without any form of authentication. This has several major security and functionality gaps:

*   **No Authentication:** Anyone can impersonate any user by simply knowing their username.
*   **No User Registration:** There is no formal process for users to create and own an account.
*   **Insecure Session Management:** The current session management is tied to a simple in-memory object and is not secure.
*   **No Password Protection:** The system does not handle passwords at all, which is a fundamental requirement for user accounts.

This is noted in the `ROADMAP.md` as "Authentication Enhancement".

## 3. Proposed Solution

We propose to implement a robust authentication system with the following key components:

1.  **User Registration:** A new API endpoint will be created to allow users to register with a username and a password.
2.  **Password Hashing:** User passwords will be securely hashed using a library like `bcrypt` before being stored in the database. At no point will plaintext passwords be stored.
3.  **JWT-based Authentication:** Upon successful login, the server will issue a JSON Web Token (JWT) to the client. This token will be sent with subsequent requests to authenticate the user.
4.  **Protected Routes:** API endpoints that require authentication will be protected. They will only be accessible to requests that include a valid JWT.

## 4. Implementation Plan

This plan assumes that the "Database Integration" feature has been implemented, as a database is required to store user accounts.

### Step 1: Project Setup

1.  **Add Dependencies:** Add `bcrypt` for password hashing and `jsonwebtoken` for handling JWTs to `api/package.json`.
    ```bash
    cd api
    npm install bcrypt jsonwebtoken
    npm install @types/bcrypt @types/jsonwebtoken --save-dev
    ```

### Step 2: Update User Model

1.  **Modify Schema:** Update the `User` model in `prisma/schema.prisma` to include a `passwordHash` field.
    ```prisma
    model User {
      id           Int      @id @default(autoincrement())
      username     String   @unique
      passwordHash String
      // ... other fields and relations
    }
    ```
2.  **Run Migration:** Apply the schema change to the database.
    ```bash
    npx prisma migrate dev --name add-user-password
    ```

### Step 3: Implement Authentication Service

1.  **Create `AuthService.ts`:** Create a new `api/service/AuthService.ts`. This service will handle:
    *   `register(username, password)`: Hashes the password using `bcrypt` and creates a new user in the database.
    *   `login(username, password)`: Finds the user by username, compares the provided password with the stored hash using `bcrypt.compare()`. If valid, it generates and returns a JWT.
2.  **JWT Generation:** The JWT will be signed with a secret key (stored in an environment variable) and will contain the user's ID and username in its payload.

### Step 4: Create API Endpoints

1.  **Update `UsersController.ts` or create `AuthController.ts`:**
    *   **`POST /register`**: A new public endpoint that calls `AuthService.register()`.
    *   **`POST /login`**: A new public endpoint that calls `AuthSercice.login()` and returns the JWT to the client.
    *   **`POST /logout`**: (Optional) Can be implemented on the client-side by simply deleting the JWT. A server-side blocklist could be added for enhanced security.
2.  **Deprecate Old User Creation:** The existing `POST /users/` endpoint for creating a user session should be removed or repurposed.

### Step 5: Secure API Endpoints

1.  **Create Middleware:** Implement an authentication middleware (e.g., using Express middleware) that checks for a valid JWT in the `Authorization` header of incoming requests.
2.  **Apply Middleware:** Apply this middleware to all API routes that require an authenticated user (e.g., creating a game, joining a game, submitting orders). The middleware will extract the user's identity from the token and attach it to the request object for use by the controllers.

### Step 6: Frontend Integration (Client)

1.  **Create Registration and Login Views:** Add new pages/views in the Vue client for user registration and login.
2.  **Update `User.store.ts`:** Modify the user store to:
    *   Call the new `/login` and `/register` endpoints.
    *   Store the JWT securely (e.g., in `localStorage` or a cookie).
    *   Include the JWT in the `Authorization` header of all subsequent API requests.
3.  **Implement Route Guards:** Use Vue Router's navigation guards to protect frontend routes that should only be accessible to logged-in users (e.g., the game dashboard).

## 5. Benefits

*   **Greatly Improved Security:** Protects user accounts and prevents unauthorized access to the application.
*   **Proper User Accounts:** Provides a foundation for user-specific features and data.
*   **Industry Standard:** Aligns the application with standard, proven practices for web authentication.
