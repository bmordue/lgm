<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useUserStore } from '../stores/User.store'

const API_URL = "http://localhost:3000"
const gameList = ref([])

watchEffect(async () => {
  gameList.value = (await (await fetch(`${API_URL}/games`)).json()).gameIds;
});

async function callCreate() {
  const userStore = useUserStore();

  const token = await userStore.getToken();

  const response = await fetch(`${API_URL}/games`, {
    method: "post",
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

async function join(id :number) {
  await fetch(`${API_URL}/games/${id}`, { method: "put" });
}

</script>

<template>
  <h1>Games</h1>
  <ul>
    <li v-for="gameId in gameList">
      <span @click="join(gameId)">{{ gameId }}</span>
    </li>
  </ul>
  <button @click="callCreate()">Create</button>
</template>
