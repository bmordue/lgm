import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue')
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue')
    },
    {path: '/login', name: 'login', component: () => import('../views/LoginView.vue')},
    {path: '/reset', name: 'reset', component: () => import('../views/ResetView.vue')},
    {path: '/dashboard', name: 'dashboard', component: () => import('../views/DashboardView.vue')},
    {path: '/game', name: 'game', component: () => import('../views/GameView.vue')}
  ]
})

export default router
