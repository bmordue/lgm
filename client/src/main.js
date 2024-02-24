import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

router.beforeEach((to, from, next) => {
    if (requiresAuth(to) && !isAuthenticated) {
        next('/login')
    } else {
        next()
    }
})

app.use(router)

app.mount('#app')
