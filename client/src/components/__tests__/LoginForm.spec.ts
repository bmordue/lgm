import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginForm from '../LoginForm.vue'
import { createPinia, setActivePinia } from 'pinia'

describe('LoginForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the proxy-auth info message', () => {
    const wrapper = mount(LoginForm)
    expect(wrapper.find('.info-message').exists()).toBe(true)
    expect(wrapper.find('.info-message').text()).toContain('Authentication is handled automatically')
  })

  it('does not render a login form', () => {
    const wrapper = mount(LoginForm)
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('input[type="password"]').exists()).toBe(false)
  })
})
