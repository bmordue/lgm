<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useUserStore } from '@/stores/User.store'

const userStore = useUserStore()
const isAuthenticated = computed(() => userStore.isAuthenticated)
const username = computed(() => userStore.user?.name || '')

function logout() {
  userStore.logout()
}

onMounted(() => {
  userStore.fetchCurrentUser();
});
</script>

<template>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header>
    <RouterLink to="/" class="logo-link" aria-label="Go to home">
      <img alt="" class="logo" src="@/assets/logo.svg" width="125" height="125" />
    </RouterLink>

    <div class="wrapper">
      <nav>
        <span v-if="userStore.user" class="user-greeting">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-icon greeting-icon" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Welcome, {{ userStore.user.name }}!
        </span>
        <RouterLink v-if="isAuthenticated" to="/dashboard">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-icon" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Dashboard
        </RouterLink>
        <RouterLink v-if="!isAuthenticated" to="/login">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-icon" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
          Login
        </RouterLink>
        <RouterLink v-if="!isAuthenticated" to="/reset">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-icon" aria-hidden="true"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          Reset
        </RouterLink>
        <button v-if="isAuthenticated" class="logout-btn" @click="logout">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-icon" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Logout ({{ username }})
        </button>
      </nav>
    </div>
  </header>

  <main id="main-content" tabindex="-1">
    <RouterView />
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: hsla(160, 100%, 37%, 1);
  color: white;
  padding: 8px;
  z-index: 100;
  transition: top 0.2s;
  text-decoration: none;
  border-bottom-right-radius: 8px;
}

.skip-link:focus {
  top: 0;
}

.logo-link {
  display: block;
  margin: 0 auto 2rem;
  border-radius: 8px;
}

.logo-link:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 4px;
}

.logo-link:active {
  transform: scale(0.98);
}

.logo {
  display: block;
  margin: 0;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.user-greeting {
  padding: 0 1rem;
  color: var(--color-text);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.nav-icon {
  flex-shrink: 0;
  color: hsla(160, 100%, 37%, 1);
}

.greeting-icon {
  color: var(--color-text);
}

nav .router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active .nav-icon {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav > * {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 1rem;
  transition: 0.4s;
  border-radius: 4px;
}

nav > * + * {
  border-left: 1px solid var(--color-border);
}

nav > *:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 2px;
}

nav > *:active:not(.user-greeting) {
  transform: scale(0.98);
}

nav button {
  background: none;
  border: none;
  font-family: inherit;
  font-size: inherit;
  color: hsla(160, 100%, 37%, 1); /* Match brand green */
  cursor: pointer;
  padding: 0 1rem; /* Match links padding */
  line-height: 1.5;
}

nav button:hover, nav a:hover {
  background-color: hsla(160, 100%, 37%, 0.2);
}

.logout-btn {
  background: none;
  border-top: none;
  border-right: none;
  border-bottom: none;
  color: hsla(160, 100%, 37%, 1);
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  transition: 0.4s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.logout-btn:hover {
  background-color: hsla(160, 100%, 37%, 0.2);
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo-link {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;
    justify-content: flex-start;
    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
