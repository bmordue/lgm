<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useUserStore } from './stores/User.store';

const userStore = useUserStore();
</script>

<template>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header>
    <RouterLink to="/" class="logo-link" aria-label="Go to home">
      <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />
    </RouterLink>

    <div class="wrapper">
      <nav>
        <RouterLink v-if="userStore.isAuthenticated" to="/dashboard">Dashboard</RouterLink>
        <RouterLink v-if="!userStore.isAuthenticated" to="/login">Login</RouterLink>
        <RouterLink v-if="!userStore.isAuthenticated" to="/reset">Reset</RouterLink>
        <button
          v-if="userStore.isAuthenticated"
          type="button"
          @click="userStore.logout"
        >
          Logout
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

.logo {
  display: block;
  margin: 0;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav > * {
  display: inline-block;
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

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
