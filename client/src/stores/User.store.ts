import router from '@/router';
import { defineStore } from 'pinia';
import { API_URL } from '@/config';

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
    /**
     * Fetch the current user identity from the API.
     * The proxy injects identity headers; the API resolves them and returns the user.
     * In development without a proxy, DEV_STUB_USER on the server side handles identity.
     */
    async fetchCurrentUser() {
      const res = await fetch(`${API_URL}/users/me`, {
        credentials: 'include',
      });

      if (!res.ok) {
        this.user = null;
        localStorage.removeItem('user');
        return;
      }

      const data: UserInfo = await res.json();
      if (data.isGuest) {
        this.user = null;
        localStorage.removeItem('user');
        return;
      }

      this.user = data;
      localStorage.setItem('user', JSON.stringify(this.user));
    },
    logout() {
      this.user = null;
      localStorage.removeItem('user');
      router.push('/login');
    },
  }
})

interface UserInfo {
  id?: string;
  name: string;
  email?: string;
  groups?: string[];
  isGuest?: boolean;
}
