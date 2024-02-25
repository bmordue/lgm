<template>
    <h1>Login</h1>
    <form @submit="onSubmit">
        <input type="text" v-model="email" placeholder="Email" />
        <input type="password" v-model="password" placeholder="Password" />
        <input type="submit" value="Login" />
    </form>
</template>

<script lang="ts">
export default {
    methods: {
        onSubmit() {
            axios.post('/api/login', {
                email: this.email,
                password: this.password
            })
                .then(response => {
                    // handle successful login
                    // Login.vue
                    this.$router.push(this.$route.query.redirect || '/')

                })
                .catch(error => {
                    // handle login error
                })
        }
    }
}
</script>
