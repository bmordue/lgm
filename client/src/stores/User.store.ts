import router from '@/router';
import { defineStore } from 'pinia';
import { API_URL } from '@/main';

export const useUserStore = defineStore('user', {
  state: () => {
    return {
      user: null as UserInfo | null,
    }
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

      // redirect to home page
      router.push('/');
    },
    getToken(): string | null {
      // get user from local storage 
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      if (user) {
        return user.token;
      }

      return null;
    },
    isAuthenticated(): boolean {
      return localStorage.getItem('user') != null;
    }
  }
})

interface UserInfo {
  name: string
  token: string
}
