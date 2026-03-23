import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginForm from '../LoginForm.vue'
import { createPinia, setActivePinia } from 'pinia'

describe('LoginForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders properly', () => {
    const wrapper = mount(LoginForm)
    expect(wrapper.find('label[for="username"]').text()).toBe('Username')
    expect(wrapper.find('label[for="password"]').text()).toBe('Password')
    expect(wrapper.find('button[type="submit"]').text()).toBe('log in')
  })

  it('shows loading state when isLoggingIn is true', async () => {
    const wrapper = mount(LoginForm)
    await wrapper.setData({ isLoggingIn: true })
    const button = wrapper.find('button[type="submit"]')
    expect(button.text()).toBe('logging in...')
    expect(button.element.disabled).toBe(true)
  })
})
