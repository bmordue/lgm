import router from '@/router';
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => {
    return {
      user: null as UserInfo | null,
    }
  },
  actions: {
    async login(username: string, password: string) {
      try {
        const res = await fetch(
          "http://localhost:3000/users/login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
          }
        );
        const data = await res.json();
        // update pinia state
        this.user = { name: username, token: data.token };

        // store user  in local storage to keep user logged in between page refreshes
        localStorage.setItem('user', JSON.stringify(this.user));

        // redirect to home page
        router.push('/');
      } catch (error) {
        console.error(error);
      }
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
