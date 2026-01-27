/**
 * Custom Error Classes
 * Provides domain-specific error types for better error handling
 */

/**
 * Base class for all LGM application errors
 */
export class LGMError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a requested resource is not found
 */
export class NotFoundError extends LGMError {
  constructor(resource: string, id?: number | string) {
    const message = id !== undefined 
      ? `${resource} with id ${id} not found`
      : `${resource} not found`;
    super(message, 404);
  }
}

/**
 * Thrown when input validation fails
 */
export class ValidationError extends LGMError {
  constructor(message: string, public field?: string) {
    super(message, 400);
  }
}

/**
 * Thrown when a game operation fails due to game state
 */
export class GameError extends LGMError {
  constructor(message: string, statusCode: number = 409) {
    super(message, statusCode);
  }
}

/**
 * Thrown when a player operation fails
 */
export class PlayerError extends LGMError {
  constructor(message: string, statusCode: number = 409) {
    super(message, statusCode);
  }
}

/**
 * Thrown when an unauthorized action is attempted
 */
export class UnauthorizedError extends LGMError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Helper function to check if an error is an LGM application error
 */
export function isLGMError(error: any): error is LGMError {
  return error instanceof LGMError;
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: Error): { message: string; statusCode: number; stack?: string } {
  if (isLGMError(error)) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      ...(process.env.LGM_DEBUG === 'true' && { stack: error.stack })
    };
  }
  
  return {
    message: error.message || 'Internal server error',
    statusCode: 500,
    ...(process.env.LGM_DEBUG === 'true' && { stack: error.stack })
  };
}
