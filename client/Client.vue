<script setup>
import { ref, watchEffect } from 'vue'

const API_URL = "http://localhost:4029"
 const gameList = ref([])

watchEffect(async () => {
  gameList.value = await (await fetch(`${API_URL}/games)).json().gameIds;
});
  
async function callCreate() {
  const response = await fetch(`${API_URL}/games`, {method: "post"});
}

async function join(id) {
  await fetch(`${API_URL}/games/${id}`, {method: "put"});
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
