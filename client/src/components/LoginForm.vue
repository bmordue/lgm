<template>
    <div id="app">
        <form @submit.prevent="login">
            <input v-model="username" placeholder="username">
            <input v-model="password" placeholder="password" type="password">
            <input type="submit" value="log in">
        </form>
    </div>
</template>
  
<script>
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
            const { username, password } = this;
            const res = await fetch(
                "http://localhost:3000/users/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ username, password })
                }
            );
            const data = await res.json();
            const token = data.token;
        }
    }
};
</script>