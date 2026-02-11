import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import LoginForm from '../LoginForm.vue'

describe('HelloWorld', () => {
  it.skip('renders properly', () => {
    const wrapper = mount(LoginForm, { props: { } })
    expect(wrapper.text()).toContain('Login view')
  })
})
