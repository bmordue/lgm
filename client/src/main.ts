import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import type { RouteLocationNormalized } from 'vue-router'


const requiresAuth = (to: RouteLocationNormalized) => {
    
    return !['/login', '/reset'].includes(to.path);
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

const app = createApp(App)
app.use(router)

app.mount('#app')