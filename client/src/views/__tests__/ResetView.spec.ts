import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import ResetView from '../ResetView.vue';

describe('ResetView.vue', () => {
  it('renders the reset instructions and back link', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/login', component: { template: '<div>Login</div>' } }],
    });

    const wrapper = mount(ResetView, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.find('h1').text()).toBe('Account Reset');
    expect(wrapper.find('.info-message').text()).toContain('Please contact your system administrator');
    const backLink = wrapper.find('.back-link');
    expect(backLink.exists()).toBe(true);
    expect(backLink.text()).toContain('Back to Login');
  });
});
