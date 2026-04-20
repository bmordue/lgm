<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useUserStore } from './stores/User.store';

const userStore = useUserStore();
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

    <div class="wrapper">
      <nav>
        <RouterLink v-if="userStore.isAuthenticated" to="/dashboard">Dashboard</RouterLink>
        <RouterLink v-if="!userStore.isAuthenticated" to="/login">Login</RouterLink>
        <RouterLink v-if="!userStore.isAuthenticated" to="/reset">Reset</RouterLink>
        <button v-if="userStore.isAuthenticated" @click="userStore.logout">Logout</button>
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
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
}

nav > * + * {
  border-left: 1px solid var(--color-border);
}

nav button {
  background: none;
  border: none;
  font-family: inherit;
  font-size: inherit;
  color: hsla(160, 100%, 37%, 1); /* Match brand green */
  cursor: pointer;
  padding: 3px 1rem; /* Adjust padding to match links */
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

  .logo {
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
