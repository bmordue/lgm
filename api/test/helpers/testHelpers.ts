/**
 * Test Helper Utilities
 * Common test utilities to reduce duplication across test files
 */

import * as store from "../../service/Store";

/**
 * Clean slate for tests - deletes all data from the store
 */
export function resetStore(): void {
  store.deleteAll();
}

/**
 * Create a mock Exegesis context for controller tests
 */
export function createMockContext(
  requestBody?: any,
  params?: any,
  query?: any
): any {
  return {
    requestBody: requestBody || {},
    params: params || {},
    req: {
      query: query || {},
    },
    res: {
      status: function (statusCode: number) {
        this.statusCode = statusCode;
        return this;
      },
      json: function (body: any) {
        this.body = body;
        return this;
      },
      statusCode: 200,
      body: {},
    },
  };
}

/**
 * Generate a unique username for testing
 */
export function generateUsername(prefix: string = "testuser"): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/**
 * Generate a unique password for testing
 */
export function generatePassword(): string {
  return `password_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}
