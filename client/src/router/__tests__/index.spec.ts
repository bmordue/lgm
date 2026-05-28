import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import router from '../index'
import { AUTH_TOKEN_STORAGE_KEY } from '@/utils/auth'

describe('router auth guards', () => {
  beforeEach(async () => {
    localStorage.clear()
    await router.replace('/')
  })

  afterEach(async () => {
    await router.replace('/')
  })

  it('redirects unauthenticated users away from protected routes', async () => {
    await router.push('/dashboard')

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('redirects authenticated users away from auth pages', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-123')

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('dashboard')
  })
})
