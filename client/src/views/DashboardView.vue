<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useUserStore } from '../stores/User.store'
import  router  from '../router';
import { useGamesStore, type World } from '@/stores/Games.store';

const API_URL = "http://localhost:3000"
const gameList = ref([])

watchEffect(async () => {
  gameList.value = (await (await fetch(`${API_URL}/games`)).json()).gameIds;
});

async function callCreate() {
  const userStore = useUserStore();

  const token = userStore.getToken();

  const response = await fetch(`${API_URL}/games`, {
    method: "post",
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // TODO: update gameList here!
}

async function join(id: number) {
  const userStore = useUserStore();

  const token = userStore.getToken();

  const resp = await fetch(`${API_URL}/games/${id}`, {
    method: "put", headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const joinBody = await resp.json() as {gameId: number, playerId :number, turn :number, world :World};
  const gamesStore = useGamesStore();
  gamesStore.updateJoinResponse(joinBody);
  router.push('/game'); // TODO: route to game screen here.

  
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
