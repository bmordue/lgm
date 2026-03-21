<template>
    <div id="login">
        <form @submit.prevent="login" class="login-form">
            <label for="username">Username</label>
            <input id="username" v-model="username" placeholder="Username" :disabled="isLoggingIn" required>

            <label for="password">Password</label>
            <input id="password" v-model="password" type="password" placeholder="Password" :disabled="isLoggingIn" required>

            <button type="submit" :disabled="isLoggingIn" class="submit-btn">
                {{ isLoggingIn ? 'Logging in...' : 'Log in' }}
            </button>
        </form>
    </div>
</template>
  
<script lang="ts">
import { useUserStore } from '../stores/User.store';
export default {
    name: "LoginForm",
    data() {
        return { username: "", password: "", isLoggingIn: false };
    },
    methods: {
        async login() {
            if (this.isLoggingIn) return;
            this.isLoggingIn = true;
            try {
                await useUserStore().login(this.username, this.password);
            } finally {
                this.isLoggingIn = false;
            }
        }
    }
};
</script>

<style scoped>
.login-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 250px;
    margin-top: 1rem;
}
.submit-btn {
    margin-top: 0.5rem;
    padding: 0.5rem;
    cursor: pointer;
}
:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
