import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../service/AuthService';
import * as logger from '../utils/Logger';

export interface RuntimeUser {
  id: string;
  email: string;
  name: string;
  groups: string[];
  isGuest: boolean;
}

const GUEST_USER: RuntimeUser = {
  id: 'guest',
  email: '',
  name: 'Guest',
  groups: [],
  isGuest: true,
};

// In-memory registry of provisioned users (email -> RuntimeUser)
const usersByEmail: Map<string, RuntimeUser> = new Map();
const authAttemptBuckets: Map<string, { count: number; resetAt: number }> = new Map();

function parseDevStubUser(stub: string): RuntimeUser | null {
  // Format: email:Display Name:group1,group2
  const firstColon = stub.indexOf(':');
  if (firstColon === -1) return null;
  const email = stub.slice(0, firstColon).toLowerCase().trim();
  if (!email) return null;

  const rest = stub.slice(firstColon + 1);
  const secondColon = rest.indexOf(':');
  let name: string;
  let groups: string[];

  if (secondColon === -1) {
    name = rest.trim() || email;
    groups = [];
  } else {
    name = rest.slice(0, secondColon).trim() || email;
    const groupsStr = rest.slice(secondColon + 1).trim();
    groups = groupsStr ? groupsStr.split(',').map(g => g.trim()).filter(Boolean) : [];
  }

  return provisionUser(email, name, groups);
}

function provisionUser(email: string, name: string, groups: string[]): RuntimeUser {
  const existing = usersByEmail.get(email);
  if (existing) {
    return existing;
  }
  const user: RuntimeUser = {
    id: email,
    email,
    name: name || email,
    groups,
    isGuest: false,
  };
  usersByEmail.set(email, user);
  return user;
}

function resolveBearerToken(authHeader: string): string | null {
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

function isAuthMutation(req: Request): boolean {
  return req.method === 'POST' && (req.path === '/users/login' || req.path === '/users/register');
}

function shouldRateLimit(req: Request): boolean {
  return isAuthMutation(req) || Boolean(req.headers.authorization);
}

function pruneExpiredAuthAttemptBuckets(now: number): void {
  for (const [bucketKey, bucket] of authAttemptBuckets.entries()) {
    if (bucket.resetAt <= now) {
      authAttemptBuckets.delete(bucketKey);
    }
  }
}

export function limitAuthAttempts(req: Request, res: Response, next: NextFunction): void {
  if (enforceAuthRateLimit(req, res)) {
    return;
  }

  next();
}

function enforceAuthRateLimit(req: Request, res: Response): boolean {
  if (!shouldRateLimit(req)) {
    return false;
  }

  const windowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60_000);
  const maxAttempts = Number(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || 10);
  const bucketKey = `${req.ip}:${req.path}`;
  const now = Date.now();
  pruneExpiredAuthAttemptBuckets(now);
  const existingBucket = authAttemptBuckets.get(bucketKey);

  if (!existingBucket || existingBucket.resetAt <= now) {
    authAttemptBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return false;
  }

  existingBucket.count += 1;
  if (existingBucket.count > maxAttempts) {
    res.setHeader('Retry-After', Math.max(1, Math.ceil((existingBucket.resetAt - now) / 1000)).toString());
    res.status(429).json({ message: 'Too many authentication attempts. Please try again shortly.' });
    return true;
  }

  return false;
}

/**
 * Express middleware that reads identity headers injected by an upstream
 * nginx + Authelia reverse proxy and provisions a RuntimeUser on res.locals.user.
 *
 * Header resolution order:
 *   1. Remote-User (preferred) or Remote-Email
 *   2. Remote-Name (defaults to email)
 *   3. Remote-Groups (comma-separated; empty array if absent)
 *
 * In non-production environments, DEV_STUB_USER env var may be used as a fallback
 * when no proxy headers are present.
 */
export function loadUser(req: Request, res: Response, next: NextFunction): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const requireProxyAuthEnv = process.env.REQUIRE_PROXY_AUTH === 'true';
  const authorizationHeader = req.headers.authorization;

  if (authorizationHeader) {
    const token = resolveBearerToken(authorizationHeader);
    if (!token) {
      res.locals.authError = 'Invalid authorization header';
      res.locals.user = GUEST_USER;
      logger.info({ message: '[auth] invalid authorization header' });
      return next();
    }

    try {
      const decodedUser = verifyToken(token);
      const user = provisionUser(decodedUser.email, decodedUser.name, decodedUser.groups);
      res.locals.user = user;
      delete res.locals.authError;
      logger.info({ message: `[auth] principal="${user.email}" (bearer)` });
      return next();
    } catch (_err) {
      res.locals.authError = 'Invalid authentication token';
      res.locals.user = GUEST_USER;
      if (process.env.NODE_ENV !== 'production' && _err instanceof Error) {
        logger.warn({ message: `[auth] invalid bearer token: ${_err.message}` });
      } else {
        logger.info({ message: '[auth] invalid bearer token' });
      }
      return next();
    }
  }

  const rawEmail =
    (req.headers['remote-user'] as string | undefined) ||
    (req.headers['remote-email'] as string | undefined);

  if (rawEmail) {
    const email = rawEmail.toLowerCase().trim();
    const name = ((req.headers['remote-name'] as string | undefined) || '').trim() || email;
    const groupsHeader = (req.headers['remote-groups'] as string | undefined) || '';
    const groups = groupsHeader ? groupsHeader.split(',').map(g => g.trim()).filter(Boolean) : [];

    const user = provisionUser(email, name, groups);
    res.locals.user = user;
    logger.info({ message: `[auth] principal="${email}"` });
    return next();
  }

  // No proxy headers present — try DEV_STUB_USER in non-production
  if (!isProduction && !requireProxyAuthEnv) {
    const stub = process.env.DEV_STUB_USER;
    if (stub) {
      const user = parseDevStubUser(stub);
      if (user) {
        res.locals.user = user;
        logger.info({ message: `[auth] principal="${user.email}" (DEV_STUB_USER)` });
        return next();
      }
    }
  }

  // Fall back to guest sentinel
  res.locals.user = GUEST_USER;
  logger.info({ message: '[auth] principal="guest"' });
  next();
}

/**
 * Middleware that rejects requests from the guest sentinel with 401.
 * Apply this to routes that require an authenticated user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user: RuntimeUser | undefined = res.locals.user;
  if (!user || user.isGuest) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Strict-mode middleware: rejects requests that arrive without Remote-User /
 * Remote-Email headers when NODE_ENV=production or REQUIRE_PROXY_AUTH=true.
 * Pass-through otherwise (useful in development without a proxy).
 * Register explicitly on routes or globally if needed; not registered by default.
 */
export function requireProxyAuth(req: Request, res: Response, next: NextFunction): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const requireProxyAuthEnv = process.env.REQUIRE_PROXY_AUTH === 'true';

  if (isProduction || requireProxyAuthEnv) {
    const rawEmail =
      (req.headers['remote-user'] as string | undefined) ||
      (req.headers['remote-email'] as string | undefined);
    if (!rawEmail) {
      res.status(401).json({ message: 'Proxy authentication required' });
      return;
    }
  }
  next();
}
