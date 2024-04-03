import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

export const API_URL = "http://localhost:3000"

const app = createApp(App)
app.use(router)

app.use(createPinia())
app.mount('#app')