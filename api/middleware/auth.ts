import { Request, Response, NextFunction } from 'express';
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
