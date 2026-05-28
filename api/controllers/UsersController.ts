import { ExegesisContext } from "exegesis";
import * as AuthService from "../service/AuthService";

/**
 * POST /users/register — create a new user and issue a bearer token.
 */
export async function registerUser(context: ExegesisContext) {
  const { username, password } = context.requestBody || {};

  try {
    const result = await AuthService.register(username, password);
    context.res.status(201).json(result);
  } catch (error: any) {
    context.res.status(error.status || 500).json({ message: error.message || 'Failed to register user' });
  }
}

/**
 * POST /users/login — authenticate a user and issue a bearer token.
 */
export async function loginUser(context: ExegesisContext) {
  const { username, password } = context.requestBody || {};

  try {
    const result = await AuthService.login(username, password);
    context.res.status(200).json(result);
  } catch (error: any) {
    context.res.status(error.status || 500).json({ message: error.message || 'Failed to authenticate user' });
  }
}

/**
 * GET /users/me — returns the current user from res.locals.user.
 */
export function getCurrentUser(context: ExegesisContext) {
  const authError = (context.req as any).res?.locals?.authError;
  if (authError) {
    context.res.status(401).json({ message: authError });
    return;
  }

  const user = (context.req as any).res?.locals?.user ?? {
    id: 'guest',
    email: '',
    name: 'Guest',
    groups: [],
    isGuest: true,
  };
  context.res.status(200).json(user);
}
