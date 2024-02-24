<script setup>
import { ref, watchEffect } from 'vue'

const API_URL = "http://localhost:3000"
const gameList = ref([])
let loggedIn = false

watchEffect(async () => {
  gameList.value = await (await fetch(`${API_URL}/games`)).json().gameIds;
});

// Client.vue

watchEffect(async () => {

  // Get auth state from localStorage, API call, etc 
  const isAuthenticated = await checkAuth()

  if (!isAuthenticated) {
    this.$router.push('/login')
  }

})

async function checkAuth() {
  // return true or false based on auth state
  return true;
}

async function login() {
  loggedIn = true;
  localStorage.setItem('token', 'DUMMY_TOKEN');
}

async function callCreate() {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}/games`, {
    method: "post",
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}


async function join(id) {
  await fetch(`${API_URL}/games/${id}`, { method: "put" });
}

// Client.vue

async function created() {
  if (!this.$store.getters.isAuthenticated) {
    this.$router.push('/login')
  }
}
async function created() {
  this.$store.dispatch('fetchUserProfile') 
}





</script>

<template>
  <div>
    <button v-if="!loggedIn" @click="login()">Sign in</button>
  </div>

  <!-- <div v-if="loggedIn"> -->
  <h1>Games</h1>
  <ul>
    <li v-for="gameId in gameList">
      <span @click="join(gameId)">{{ gameId }}</span>
    </li>
  </ul>
  <button @click="callCreate()">Create</button>

  <!-- </div> -->
</template>
