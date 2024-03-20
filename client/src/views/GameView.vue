<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useUserStore } from '../stores/User.store'
import { useGamesStore, type Actor } from '../stores/Games.store'

const game = ref({})

const gamesStore = useGamesStore();

watchEffect(async () => {
  game.value = gamesStore.getCurrentGame();
});

function actorToString(actor :Actor) {
  return `Owner: ${actor.owner} (${actor.pos.x}, ${actor.pos.y}) [${actor.id}]`;
}

</script>


<template>
    <h1>Game id # {{ game.gameId }}</h1>
    <h2>Turn # {{ game.turn }}</h2>
    <h2>World</h2>
    <p></p>
    <p style="font-family: monospace;">
      <div v-for="row in game.world.terrain">
        <span>{{ row.join(' ').replaceAll('0', '.').replaceAll('1','X') }}</span>
      </div><br />
    </p>
    <h2>Actors</h2>
    <p></p>
    <p style="font-family: monospace;">
      <ul>
      <li v-for="actor in game.world.actors">
        <span>{{ actorToString(actor) }}</span>
      </li>
      </ul><br />
    </p>
    <button @click="callPostOrders()">Post orders</button>
  </template>

