import router from '@/router';
import { defineStore } from 'pinia';
import { API_URL } from '@/main';

export const useUserStore = defineStore('user', {
  state: () => {
    const savedUser = localStorage.getItem('user');
    return {
      user: savedUser ? (JSON.parse(savedUser) as UserInfo) : (null as UserInfo | null),
    }
  },
  getters: {
    isAuthenticated: (state) => state.user !== null,
  },
  actions: {
    async login(username: string, password: string) {
      const res = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await res.json();
      // update pinia state
      this.user = { name: username, token: data.token };

      // store user  in local storage to keep user logged in between page refreshes
      localStorage.setItem('user', JSON.stringify(this.user));

      // redirect to dashboard page
      router.push('/dashboard');
    },
    logout() {
      this.user = null;
      localStorage.removeItem('user');
      router.push('/login');
    },
    getToken(): string | null {
      return this.user ? this.user.token : null;
    },
  }
})

interface UserInfo {
  name: string
  token: string
}
