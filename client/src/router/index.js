import { createRouter, createWebHistory } from 'vue-router'
import Login from '../Login.vue'
import Client from '../components/Client.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'client',
      component: Client
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    }
  ]
})

export default router
