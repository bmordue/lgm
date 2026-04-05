<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useUserStore } from '@/stores/User.store'

const userStore = useUserStore()
const isAuthenticated = computed(() => userStore.isAuthenticated)

function handleLogout() {
  userStore.logout()
}
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

    <div class="wrapper">
      <nav>
        <RouterLink v-if="isAuthenticated" to="/dashboard">Dashboard</RouterLink>
        <RouterLink v-if="!isAuthenticated" to="/login">Login</RouterLink>
        <button v-if="isAuthenticated" @click="handleLogout" class="logout-btn">Logout</button>
        <RouterLink to="/reset">Reset</RouterLink>
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

nav .router-link-exact-active {
  color: var(--color-text);
}

nav .router-link-exact-active:hover {
  background-color: transparent;
}

nav > * {
  display: inline-block;
  padding: 0 1rem;
}

nav > * + * {
  border-left: 1px solid var(--color-border);
}

.logout-btn {
  background: none;
  border: none;
  color: hsla(160, 100%, 37%, 1);
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  transition: 0.4s;
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
