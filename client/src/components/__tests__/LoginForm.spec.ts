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
    expect(wrapper.find('label[for="username"]').text()).toBe('Username *')
    expect(wrapper.find('label[for="password"]').text()).toBe('Password *')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Log In')
  })

  it('shows loading state when isLoggingIn is true', async () => {
    const wrapper = mount(LoginForm)
    await wrapper.setData({ isLoggingIn: true })
    const button = wrapper.find('button[type="submit"]')
    expect(button.text()).toBe('Logging In...')
    expect(button.element.disabled).toBe(true)
  })

  it('displays error message when errorMessage is set', async () => {
    const wrapper = mount(LoginForm)
    const errorText = 'Invalid username or password'
    await wrapper.setData({ errorMessage: errorText })
    const errorDiv = wrapper.find('.error-message')
    expect(errorDiv.exists()).toBe(true)
    expect(errorDiv.text()).toBe(errorText)
    expect(errorDiv.attributes('role')).toBe('alert')
  })
})
