import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginForm from '../LoginForm.vue'
import { createPinia, setActivePinia } from 'pinia'

const { pushMock, loginMock, registerMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  loginMock: vi.fn(),
  registerMock: vi.fn(),
}))

vi.mock('../../router', () => ({
  default: {
    push: pushMock,
  },
}))

vi.mock('../../stores/User.store', () => ({
  useUserStore: () => ({
    login: loginMock,
    register: registerMock,
  }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    pushMock.mockReset()
    loginMock.mockReset()
    registerMock.mockReset()
  })

  it('renders username and password inputs', () => {
    const wrapper = mount(LoginForm, {
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    })

    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('input[name="username"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
  })

  it('submits login credentials and navigates to the dashboard', async () => {
    loginMock.mockResolvedValue(undefined)

    const wrapper = mount(LoginForm, {
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    })

    await wrapper.find('input[name="username"]').setValue('alice')
    await wrapper.find('input[name="password"]').setValue('secret')
    await wrapper.find('form').trigger('submit.prevent')

    expect(loginMock).toHaveBeenCalledWith('alice', 'secret')
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  it('submits registration credentials in register mode', async () => {
    registerMock.mockResolvedValue(undefined)

    const wrapper = mount(LoginForm, {
      props: {
        mode: 'register',
      },
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    })

    await wrapper.find('input[name="username"]').setValue('new-user')
    await wrapper.find('input[name="password"]').setValue('secret')
    await wrapper.find('form').trigger('submit.prevent')

    expect(registerMock).toHaveBeenCalledWith('new-user', 'secret')
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
    expect(wrapper.text()).toContain('Create your account')
  })

  it('shows an error message when authentication fails', async () => {
    loginMock.mockRejectedValue(new Error('Invalid username or password'))

    const wrapper = mount(LoginForm, {
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    })

    await wrapper.find('input[name="username"]').setValue('alice')
    await wrapper.find('input[name="password"]').setValue('bad-password')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.find('[role="alert"]').text()).toContain('Invalid username or password')
  })
})
