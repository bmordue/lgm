# Authentication Model

LGM uses a **reverse-proxy / forward-auth** pattern. The service itself is auth-agnostic: it trusts identity headers injected by an upstream nginx + Authelia stack and uses them only for ownership and permission checks. No bearer tokens are issued or validated by the LGM API.

---

## Deployment Topology

```
Browser
  │  HTTPS
  ▼
nginx (reverse proxy)
  │  auth_request → Authelia (OIDC / oauth2-proxy)
  │  proxy_set_header Remote-User / Remote-Name / Remote-Email / Remote-Groups
  ▼
lgm API (127.0.0.1:3000)
  │  res.locals.user populated by loadUser middleware
  ▼
Express route handlers / Exegesis controllers
```

The LGM API binds to `127.0.0.1` in production so it is only reachable through the proxy. In development it binds to all interfaces and uses the `DEV_STUB_USER` fallback.

---

## Identity Headers

| Header          | Required | Description |
|-----------------|----------|-------------|
| `Remote-User`   | Preferred | Unique identifier for the user (email). Overrides `Remote-Email`. |
| `Remote-Email`  | Fallback  | Email address (used if `Remote-User` is absent). |
| `Remote-Name`   | Optional  | Display name. Defaults to the email value. |
| `Remote-Groups` | Optional  | Comma-separated list of groups (e.g. `admins,players`). Empty array if absent. |

### Header Resolution Order

1. `Remote-User` → email (trimmed, lowercased)
2. `Remote-Email` (if `Remote-User` absent)
3. `Remote-Name` → display name (defaults to email)
4. `Remote-Groups` → groups array (defaults to `[]`)

---

## Example nginx Configuration

```nginx
upstream lgm {
    server 127.0.0.1:3000;
}

server {
    listen 443 ssl http2;
    server_name lgm.example.com;

    # --- Auth subrequest ---
    auth_request /authelia;
    auth_request_set $remote_user  $upstream_http_remote_user;
    auth_request_set $remote_name  $upstream_http_remote_name;
    auth_request_set $remote_email $upstream_http_remote_email;
    auth_request_set $remote_groups $upstream_http_remote_groups;

    # Protect against header spoofing from untrusted clients
    proxy_set_header Remote-User   "";
    proxy_set_header Remote-Name   "";
    proxy_set_header Remote-Email  "";
    proxy_set_header Remote-Groups "";

    location / {
        proxy_pass http://lgm;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Inject identity from Authelia
        proxy_set_header Remote-User   $remote_user;
        proxy_set_header Remote-Name   $remote_name;
        proxy_set_header Remote-Email  $remote_email;
        proxy_set_header Remote-Groups $remote_groups;
    }

    location = /authelia {
        internal;
        proxy_pass http://127.0.0.1:9091/api/authz/auth-request;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Original-URL $scheme://$http_host$request_uri;
    }
}
```

---

## Example Authelia Access-Control Rules

```yaml
access_control:
  default_policy: deny
  rules:
    - domain: lgm.example.com
      policy: one_factor
      subject:
        - "group:players"
```

---

## OIDC / oauth2-proxy Notes

If using [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy/) instead of Authelia, configure it to forward the same headers:

```
--set-xauthrequest=true
--pass-user-headers=true
--email-header=X-Auth-Request-Email
```

Map the oauth2-proxy headers to the expected `Remote-*` headers in nginx:

```nginx
auth_request_set $remote_user  $upstream_http_x_auth_request_email;
auth_request_set $remote_name  $upstream_http_x_auth_request_user;
```

---

## Environment Variables

| Variable             | Default       | Purpose |
|----------------------|---------------|---------|
| `NODE_ENV`           | `development` | Set to `production` to bind to `127.0.0.1` and disable `DEV_STUB_USER`. |
| `REQUIRE_PROXY_AUTH` | (unset)       | Set to `true` to enable strict mode: disables `DEV_STUB_USER` and requires proxy headers even in non-production. |
| `DEV_STUB_USER`      | (unset)       | Dev-only fake identity. Format: `email:Display Name:group1,group2`. Ignored in production. |
| `ADMIN_GROUP`        | `admins`      | Group name granting admin privileges. |
| `LGM_PORT`           | `3000`        | TCP port the API listens on. |

---

## Local Development Instructions

In development (without a proxy), use `DEV_STUB_USER` to simulate an authenticated user:

```bash
# Set the stub user and start the API
DEV_STUB_USER="alice@example.com:Alice Smith:players" npm start
```

Or add it to a `.env` file (not committed):

```dotenv
DEV_STUB_USER=alice@example.com:Alice Smith:players
```

Alternatively, send `Remote-User` directly with curl:

```bash
# Create a game as alice
curl -X POST http://localhost:3000/games \
  -H "Remote-User: alice@example.com" \
  -H "Remote-Name: Alice Smith"

# Join the game (game ID 0)
curl -X PUT http://localhost:3000/games/0 \
  -H "Remote-User: alice@example.com"

# Get current user identity
curl http://localhost:3000/users/me \
  -H "Remote-User: alice@example.com"
```

Without either `DEV_STUB_USER` or a `Remote-User` header, the service returns the guest sentinel and protected routes respond with `401 Unauthorized`.

---

## Middleware API

### `loadUser` (Express middleware)

Registered globally on all routes. Reads proxy headers and populates `res.locals.user`:

```typescript
interface RuntimeUser {
  id: string;      // email
  email: string;
  name: string;
  groups: string[];
  isGuest: boolean;
}
```

### `requireAuth` (Express middleware)

Apply to routes that require an authenticated user. Returns `401` for the guest sentinel.

### `requireProxyAuth` (Express middleware)

Strict mode: returns `401` when `Remote-User` / `Remote-Email` headers are absent **and** `NODE_ENV=production` or `REQUIRE_PROXY_AUTH=true`. Pass-through otherwise. Not registered globally by default.

---

## Production Checklist

- [ ] nginx strips `Remote-*` headers from untrusted clients (`proxy_set_header Remote-User ""` **before** the injected values).
- [ ] `NODE_ENV=production` is set so the API binds to `127.0.0.1` and ignores `DEV_STUB_USER`.
- [ ] TLS terminates at nginx; the backend communicates over plain HTTP on loopback.
- [ ] `REQUIRE_PROXY_AUTH=true` is set if you want strict enforcement even in a mixed environment.
- [ ] Authelia / oauth2-proxy access-control rules are configured for the intended user groups.
- [ ] Audit logs (`[auth] principal="..."`) are captured and retained.

---

## Threat Model

| Threat | Mitigation |
|--------|------------|
| Header spoofing by untrusted client | nginx strips `Remote-*` before setting them from Authelia; API binds to loopback in production |
| Unauthenticated access to game routes | `requireAuth` middleware rejects guest sentinel with 401 |
| Information leakage via `X-Powered-By` | `app.disable('x-powered-by')` |
| Clickjacking | `X-Frame-Options: DENY` security header |
| MIME-type sniffing | `X-Content-Type-Options: nosniff` security header |
| Token theft | No tokens are issued; sessions are managed by the proxy/Authelia |
| DEV_STUB_USER in production | Ignored when `NODE_ENV=production` or `REQUIRE_PROXY_AUTH=true` |

---

## API Changes

- `POST /users/login` — returns `410 Gone`. Login is handled by the upstream proxy.
- `GET /users/me` — returns the current user from proxy headers (or guest sentinel).
- All game routes (`POST /games`, `PUT /games/:id`, etc.) require an authenticated user (non-guest).
- The client no longer sends `Authorization: Bearer ...` headers; session cookies from the proxy are forwarded via `credentials: 'include'`.
