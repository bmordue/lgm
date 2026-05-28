import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import type { RuntimeUser } from '../middleware/auth';
import * as logger from '../utils/Logger';

interface RegisteredUser {
  passwordHash: string;
  user: RuntimeUser;
}

interface AuthTokenPayload extends jwt.JwtPayload {
  sub: string;
  email: string;
  name: string;
  groups: string[];
}

// Temporary in-memory credential store until persistent user storage is wired in.
const registeredUsers = new Map<string, RegisteredUser>();
const passwordRounds = 12;
const tokenIssuer = 'lgm-api';
const tokenAudience = 'lgm-client';

function getTokenSecret(): string {
  const configuredSecret = process.env.AUTH_TOKEN_SECRET || process.env.JWT_SECRET;
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_TOKEN_SECRET or JWT_SECRET must be configured in production');
  }

  logger.warn({ message: '[auth] using an ephemeral token secret; tokens will reset on restart' });
  return randomBytes(32).toString('hex');
}

const tokenSecret = getTokenSecret();

function createAuthError(status: number, message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function validateCredentials(username: string, password: string): string {
  const normalizedUsername = normalizeUsername(username || '');
  if (!normalizedUsername) {
    throw createAuthError(400, 'Username is required');
  }
  if (!password || !password.trim()) {
    throw createAuthError(400, 'Password is required');
  }
  return normalizedUsername;
}

function toRuntimeUser(username: string): RuntimeUser {
  return {
    id: username,
    email: username,
    name: username,
    groups: [],
    isGuest: false,
  };
}

function sanitizeGroups(groups: unknown): string[] {
  return Array.isArray(groups) ? groups.filter((group): group is string => typeof group === 'string') : [];
}

function issueToken(user: RuntimeUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      groups: user.groups,
    },
    tokenSecret,
    {
      audience: tokenAudience,
      expiresIn: '2h',
      issuer: tokenIssuer,
    },
  );
}

function createAuthResponse(user: RuntimeUser) {
  return {
    token: issueToken(user),
    user,
  };
}

export async function register(username: string, password: string) {
  const normalizedUsername = validateCredentials(username, password);

  if (registeredUsers.has(normalizedUsername)) {
    throw createAuthError(409, 'Username is already registered');
  }

  const passwordHash = await bcrypt.hash(password, passwordRounds);
  const user = toRuntimeUser(normalizedUsername);

  registeredUsers.set(normalizedUsername, {
    passwordHash,
    user,
  });

  return createAuthResponse(user);
}

export async function login(username: string, password: string) {
  const normalizedUsername = validateCredentials(username, password);
  const existingUser = registeredUsers.get(normalizedUsername);

  if (!existingUser) {
    throw createAuthError(401, 'Invalid username or password');
  }

  const passwordMatches = await bcrypt.compare(password, existingUser.passwordHash);
  if (!passwordMatches) {
    throw createAuthError(401, 'Invalid username or password');
  }

  return createAuthResponse(existingUser.user);
}

export function verifyToken(token: string): RuntimeUser {
  if (!token.trim()) {
    throw createAuthError(401, 'Authentication token is required');
  }

  const decoded = jwt.verify(token, tokenSecret, {
    audience: tokenAudience,
    issuer: tokenIssuer,
  });

  if (typeof decoded === 'string') {
    throw createAuthError(401, 'Invalid authentication token');
  }

  const payload = decoded as AuthTokenPayload;
  if (!payload.email || !payload.sub) {
    throw createAuthError(401, 'Invalid authentication token');
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name || payload.email,
    groups: sanitizeGroups(payload.groups),
    isGuest: false,
  };
}

export function clearAuthStore(): void {
  registeredUsers.clear();
}
