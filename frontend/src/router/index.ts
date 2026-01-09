import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/game',
    name: 'game',
    component: () => import('@/views/GameView.vue')
  },
  {
    path: '/free',
    name: 'free',
    component: () => import('@/views/FreeView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router