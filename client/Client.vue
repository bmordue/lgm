<script setup>
import { ref, reactive } from 'vue'

const message = ref('Hello world')

const counter = reactive({ count: 0 })

counter.count++

// console.log(message.value)

message.value = 'Changed'

</script>

<template>
    <h1>{{ message }}</h1>
    <p>count is {{ counter.count }}</p>
</template>