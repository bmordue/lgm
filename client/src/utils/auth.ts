export const AUTH_TOKEN_STORAGE_KEY = 'auth_token'
export const USER_STORAGE_KEY = 'user'

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function createAuthHeaders(headers: HeadersInit = {}): Headers {
  const authHeaders = new Headers(headers)
  const token = getStoredAuthToken()

  if (token) {
    authHeaders.set('Authorization', 'Bearer ' + token)
  }

  return authHeaders
}
