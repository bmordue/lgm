import { ExegesisContext } from "exegesis";

/**
 * POST /users/login — deprecated.
 * Authentication is now handled by an upstream reverse proxy via identity headers.
 * This endpoint is kept for backward compatibility but always returns 410 Gone.
 */
export async function loginUser(context: ExegesisContext) {
  context.res.status(410).json({
    message: 'Login is no longer supported. Authentication is handled by the upstream proxy.',
  });
}

/**
 * GET /users/me — returns the current user from res.locals.user.
 * Returns the guest sentinel for unauthenticated requests.
 * The user is set by the loadUser middleware on the Express response locals,
 * accessible via req.res.locals in Exegesis controllers.
 */
export function getCurrentUser(context: ExegesisContext) {
  const user = (context.req as any).res?.locals?.user ?? {
    id: 'guest',
    email: '',
    name: 'Guest',
    groups: [],
    isGuest: true,
  };
  context.res.status(200).json(user);
}
