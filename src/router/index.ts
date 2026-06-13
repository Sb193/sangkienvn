import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  // ─── Auth (No Layout) ───────────────────────────────────────────────────
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/pages/RegisterPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/pages/ForgotPasswordPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: () => import('@/pages/VerifyEmailPage.vue'),
    meta: { guest: true },
  },

  // ─── App (Main Layout) ─────────────────────────────────────────────────
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Dashboard', component: () => import('@/pages/DashboardPage.vue') },
      { path: 'transactions', name: 'Transactions', component: () => import('@/pages/TransactionsPage.vue') },
      { path: 'transactions/new', name: 'AddTransaction', component: () => import('@/pages/AddTransactionPage.vue') },
      { path: 'groups', name: 'Groups', component: () => import('@/pages/GroupsPage.vue') },
      { path: 'groups/:id', name: 'GroupDetail', component: () => import('@/pages/GroupDetailPage.vue'), props: true },
      { path: 'groups/invite/:token', name: 'GroupInvite', component: () => import('@/pages/InvitePage.vue') },
      { path: 'reports', name: 'Reports', component: () => import('@/pages/ReportsPage.vue') },
      { path: 'notifications', name: 'Notifications', component: () => import('@/pages/NotificationsPage.vue') },
      { path: 'profile', name: 'Profile', component: () => import('@/pages/ProfilePage.vue') },
    ],
  },

  // ─── Catch-all ──────────────────────────────────────────────────────────
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('accessToken')
  if (to.meta.requiresAuth && !token) return next('/login')
  if (to.meta.guest && token) return next('/')
  next()
})

export default router
