// Login.vue

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