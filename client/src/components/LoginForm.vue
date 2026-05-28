<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import router from '@/router'
import { useUserStore } from '@/stores/User.store'

const props = withDefaults(defineProps<{ mode?: 'login' | 'register' }>(), {
  mode: 'login',
})

const userStore = useUserStore()
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

const isRegisterMode = computed(() => props.mode === 'register')
const headingText = computed(() => (isRegisterMode.value ? 'Create your account' : 'Sign in'))
const submitLabel = computed(() => (isRegisterMode.value ? 'Register' : 'Login'))
const alternateRoute = computed(() => (isRegisterMode.value ? '/login' : '/register'))
const alternateLabel = computed(() =>
  isRegisterMode.value ? 'Already have an account? Login' : 'Need an account? Register',
)

async function submitForm() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    if (isRegisterMode.value) {
      await userStore.register(username.value, password.value)
    } else {
      await userStore.login(username.value, password.value)
    }

    await router.push('/dashboard')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Authentication failed'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form class="auth-form" @submit.prevent="submitForm">
    <h2>{{ headingText }}</h2>

    <div v-if="errorMessage" class="error-message" role="alert">
      {{ errorMessage }}
    </div>

    <label class="field">
      <span>Username</span>
      <input v-model.trim="username" name="username" type="text" autocomplete="username" required />
    </label>

    <label class="field">
      <span>Password</span>
      <input
        v-model="password"
        name="password"
        type="password"
        autocomplete="current-password"
        required
      />
    </label>

    <button type="submit" :disabled="isSubmitting">
      {{ isSubmitting ? 'Working...' : submitLabel }}
    </button>

    <RouterLink class="alternate-link" :to="alternateRoute">
      {{ alternateLabel }}
    </RouterLink>
  </form>
</template>

<style scoped>
.auth-form {
  display: grid;
  gap: 1rem;
  max-width: 24rem;
}

.field {
  display: grid;
  gap: 0.35rem;
}

.field input {
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
}

.error-message {
  background-color: #fed7d7;
  border: 1px solid #feb2b2;
  color: #9b2c2c;
  padding: 0.75rem;
  border-radius: 4px;
}

button {
  width: fit-content;
  padding: 0.65rem 1rem;
}

.alternate-link {
  width: fit-content;
}
</style>
