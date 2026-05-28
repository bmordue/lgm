import router from '@/router'
import { defineStore } from 'pinia'
import { API_URL } from '@/config'
import { AUTH_TOKEN_STORAGE_KEY, USER_STORAGE_KEY, createAuthHeaders, getStoredAuthToken } from '@/utils/auth'

interface UserInfo {
  id?: string
  name: string
  email?: string
  groups?: string[]
  isGuest?: boolean
}

interface AuthResponse {
  token: string
  user: UserInfo
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = await response
    .json()
    .catch(() => ({ message: response.ok ? 'Unexpected server response' : 'Authentication request failed' }))

  if (!response.ok) {
    throw new Error(data.message || 'Authentication failed')
  }

  return data as T
}

export const useUserStore = defineStore('user', {
  state: () => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY)

    return {
      user: savedUser ? (JSON.parse(savedUser) as UserInfo) : (null as UserInfo | null),
      token: getStoredAuthToken(),
    }
  },
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    getToken() {
      return this.token
    },
    persistSession(session: AuthResponse) {
      this.token = session.token
      this.user = session.user
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.token)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user))
    },
    clearSession() {
      this.token = null
      this.user = null
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
      localStorage.removeItem(USER_STORAGE_KEY)
    },
    async register(username: string, password: string) {
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ username, password }),
      })

      this.persistSession(await parseJsonResponse<AuthResponse>(response))
    },
    async login(username: string, password: string) {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ username, password }),
      })

      this.persistSession(await parseJsonResponse<AuthResponse>(response))
    },
    async fetchCurrentUser() {
      const res = await fetch(`${API_URL}/users/me`, {
        credentials: 'include',
        headers: createAuthHeaders(),
      })

      if (!res.ok) {
        this.clearSession()
        return
      }

      const data: UserInfo = await res.json()
      if (data.isGuest) {
        this.clearSession()
        return
      }

      this.user = data
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.user))
    },
    logout() {
      this.clearSession()
      router.push('/login')
    },
  },
})

export type { UserInfo }
