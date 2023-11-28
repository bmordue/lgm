<script setup>
import { ref, watchEffect } from 'vue'

const API_URL = "http://localhost:5000/listGames"
 const gameList = ref([])

watchEffect(async () => {
  gameList.value = await (await fetch(API_URL)).json().gameIds;
});

</script>

<template>
    <h1>Games</h1>
    <ul>
      <li v-for="gameId in gameList">{{ gameId }}</li>
    </ul>

    <button>Create</button>
</template>
