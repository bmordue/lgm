<template>
    <div id="login">
        <form @submit.prevent="login">
            <div v-if="errorMessage" class="error-message" role="alert" aria-live="assertive">
                {{ errorMessage }}
            </div>
            <label for="username">Username</label>
            <input
                id="username"
                v-model="username"
                placeholder="username"
                required
                autocomplete="username"
                autofocus
            >
            <label for="password">Password</label>
            <input
                id="password"
                v-model="password"
                placeholder="password"
                type="password"
                required
                autocomplete="current-password"
            >
            <button
                type="submit"
                :disabled="isLoggingIn"
                :aria-busy="isLoggingIn"
                aria-live="polite"
            >
                {{ isLoggingIn ? 'logging in...' : 'log in' }}
            </button>
        </form>
    </div>
</template>
  
<script lang="ts">
import { useUserStore } from '../stores/User.store';
export default {
    name: "LoginForm",
    data() {
        return {
            username: "",
            password: "",
            isLoggingIn: false,
            errorMessage: ""
        };
    },
    methods: {
        async login() {
            this.isLoggingIn = true;
            this.errorMessage = "";
            try {
                const userStore = useUserStore();
                await userStore.login(this.username, this.password);
            } catch (error) {
                this.errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            } finally {
                this.isLoggingIn = false;
            }
        }
    }
};
</script>

<style scoped>
.error-message {
    background-color: #fce4e4;
    border: 1px solid #fcc2c2;
    color: #cc0000;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
    font-size: 0.9em;
}
</style>
