import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.component('login-form', () => import('./components/LoginForm.vue'))

app.use(createPinia())
app.mount('#app')