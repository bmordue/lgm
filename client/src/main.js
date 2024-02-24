import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

const requiresAuth = (to) => {
    
    return to.path != '/login';
  // check if route requires authentication
}

const isAuthenticated = () => {
    return false; // TODO fix this :-)
  // check if user is logged in
}

router.beforeEach((to, from, next) => {
    if (requiresAuth(to) && !isAuthenticated()) {
        next('/login')
    } else {
        next()
    }
})

app.use(router)

app.mount('#app')
