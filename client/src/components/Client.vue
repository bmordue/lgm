<script setup>
import { ref, watchEffect } from 'vue'

const API_URL = "http://localhost:3000"
const gameList = ref([])
let loggedIn = false

watchEffect(async () => {
  gameList.value = await (await fetch(`${API_URL}/games`)).json().gameIds;
});

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
