<template>
    <div id="login">
        <form @submit.prevent="login">
            <div v-if="errorMessage" class="error-message" role="alert" aria-live="assertive">
                {{ errorMessage }}
            </div>
            <label for="username">Username <span class="required" aria-hidden="true">*</span></label>
            <input
                id="username"
                v-model="username"
                placeholder="username"
                required
                autocomplete="username"
                autofocus
            >
            <label for="password">Password <span class="required" aria-hidden="true">*</span></label>
            <div class="password-wrapper">
                <input
                    id="password"
                    v-model="password"
                    placeholder="password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    autocomplete="current-password"
                >
                <button
                    type="button"
                    class="toggle-password"
                    @click="showPassword = !showPassword"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    :title="showPassword ? 'Hide password' : 'Show password'"
                >
                    {{ showPassword ? '🙈' : '👁️' }}
                </button>
            </div>
            <button
                type="submit"
                :disabled="isLoggingIn"
                :aria-busy="isLoggingIn"
                aria-live="polite"
            >
                {{ isLoggingIn ? 'Logging In...' : 'Log In' }}
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
            showPassword: false,
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
.required {
    color: #cc0000;
    margin-left: 2px;
}

.password-wrapper {
    position: relative;
    display: block;
}

.password-wrapper input {
    width: 100%;
    padding-right: 35px;
}

.toggle-password {
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
}

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
