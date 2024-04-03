<template>
    <h1>Game {{ gameTurn.gameId }}</h1>
    <h2>Turn {{ gameTurn.turn }}</h2>
    <h2>for Player {{ gameTurn.playerId }}</h2>
    <ul>
    </ul>
</template>

<script setup lang="ts">
  defineProps(['gameTurn'])
</script>