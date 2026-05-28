import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '../User.store'
import { AUTH_TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '@/utils/auth'

const { pushMock, fetchMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  fetchMock: vi.fn(),
}))

vi.mock('../../router', () => ({
  default: {
    push: pushMock,
  },
}))

global.fetch = fetchMock as typeof fetch

describe('User.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    fetchMock.mockReset()
    pushMock.mockReset()
  })

  it('stores the returned token and user on login', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          token: 'token-123',
          user: {
            id: 'alice',
            email: 'alice',
            name: 'alice',
            isGuest: false,
          },
        }),
    })

    const store = useUserStore()
    await store.login('alice', 'secret')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/login',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(store.token).toBe('token-123')
    expect(store.user?.email).toBe('alice')
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('token-123')
    expect(localStorage.getItem(USER_STORAGE_KEY)).toContain('alice')
  })

  it('adds the bearer token when fetching the current user', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-123')
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ name: 'old-user' }))

    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'alice',
          email: 'alice',
          name: 'alice',
          isGuest: false,
        }),
    })

    const store = useUserStore()
    await store.fetchCurrentUser()

    const [, options] = fetchMock.mock.calls[0]
    expect((options.headers as Headers).get('Authorization')).toBe('Bearer ' + 'token-123')
    expect(store.user?.email).toBe('alice')
  })

  it('clears the session and redirects on logout', () => {
    const store = useUserStore()
    store.persistSession({
      token: 'token-123',
      user: {
        id: 'alice',
        email: 'alice',
        name: 'alice',
        isGuest: false,
      },
    })

    store.logout()

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(pushMock).toHaveBeenCalledWith('/login')
  })
})
