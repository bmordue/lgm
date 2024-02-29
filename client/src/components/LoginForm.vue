<template>
    <div id="app">
        <form @submit.prevent="login">
            <input v-model="username" placeholder="username">
            <input v-model="password" placeholder="password" type="password">
            <input type="submit" value="log in">
        </form>
    </div>
</template>
  
<script lang="ts">
import { useUserStore } from '../stores/User.store';
export default {
    name: "App",
    data() {
        return {
            username: "",
            password: ""
        };
    },
    methods: {
        async login() {
            const userStore = useUserStore();
            await userStore.login(this.username, this.password);
        }
    }
};
</script>