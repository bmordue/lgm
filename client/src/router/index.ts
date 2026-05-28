import { createRouter, createWebHistory } from 'vue-router'
import { getStoredAuthToken } from '@/utils/auth'

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
    {path: '/register', name: 'register', component: () => import('../views/RegisterView.vue')},
    {path: '/reset', name: 'reset', component: () => import('../views/ResetView.vue')},
    {path: '/dashboard', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true }},
    {path: '/game', name: 'game', component: () => import('../views/GameView.vue'), meta: { requiresAuth: true }}
  ]
})

router.beforeEach((to) => {
  const isAuthenticated = Boolean(getStoredAuthToken())

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  }

  if (isAuthenticated && (to.name === 'login' || to.name === 'register')) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
