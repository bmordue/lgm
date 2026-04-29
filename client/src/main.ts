import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

import { API_URL } from './config'
export { API_URL }

const app = createApp(App)
app.use(router)

app.use(createPinia())
app.mount('#app')