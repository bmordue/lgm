<template>
  <div id="login">
    <form @submit.prevent="login">
      <div>
        <label for="username">Username</label>
        <input id="username" v-model="username" placeholder="username" :disabled="isLoggingIn" />
      </div>
      <div>
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          placeholder="password"
          type="password"
          :disabled="isLoggingIn"
        />
      </div>
      <button type="submit" :disabled="isLoggingIn">
        {{ isLoggingIn ? 'Logging in...' : 'log in' }}
      </button>
    </form>
  </div>
</template>

<script lang="ts">
import { useUserStore } from '../stores/User.store'
export default {
  name: 'LoginForm',
  data() {
    return {
      username: '',
      password: '',
      isLoggingIn: false
    }
  },
  methods: {
    async login() {
      this.isLoggingIn = true
      try {
        const userStore = useUserStore()
        await userStore.login(this.username, this.password)
      } finally {
        this.isLoggingIn = false
      }
    }
  }
}
</script>
