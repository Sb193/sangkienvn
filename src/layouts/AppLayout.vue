<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NIcon, NBadge, useNotification } from 'naive-ui'
import {
  HomeOutline,
  WalletOutline,
  PeopleOutline,
  StatsChartOutline,
  NotificationsOutline,
  PersonOutline,
  ReceiptOutline,
  LogOutOutline,
  AddCircleOutline,
} from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const notifs = useNotificationsStore()
const notification = useNotification()

function connectWS() {
  const token = localStorage.getItem('accessToken')
  if (!token) return

  const baseApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787/api/v1'
  const wsUrl = new URL(baseApiUrl)
  wsUrl.pathname = wsUrl.pathname + '/ws'
  wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  wsUrl.searchParams.set('token', token)

  const socket = new WebSocket(wsUrl.toString())

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'notification') {
        const notif = data.data
        // Push notification in real-time to store
        notifs.notifications.unshift(notif)
        
        // Show premium SaaS-style desktop/toast notification UI popup
        notification.info({
          title: notif.title || 'Thông báo',
          content: notif.content,
          meta: notif.created_at,
          duration: 5000,
          keepAliveOnHover: true,
        })
      }
    } catch (e) {
      console.error('[WebSocket] Message parsing error:', e)
    }
  }

  socket.onclose = () => {
    setTimeout(() => {
      if (localStorage.getItem('accessToken')) {
        connectWS()
      }
    }, 5000)
  }
}

onMounted(() => {
  notifs.fetchNotifications()
  connectWS()
})

const sidebarItems = [
  { key: 'Dashboard', icon: HomeOutline, label: 'Dashboard', path: '/' },
  { key: 'Transactions', icon: WalletOutline, label: 'Giao dịch', path: '/transactions' },
  { key: 'Groups', icon: PeopleOutline, label: 'Nhóm', path: '/groups' },
  { key: 'Reports', icon: StatsChartOutline, label: 'Báo cáo', path: '/reports' },
  { key: 'Notifications', icon: NotificationsOutline, label: 'Thông báo', path: '/notifications', badge: true },
  { key: 'Profile', icon: PersonOutline, label: 'Tài khoản', path: '/profile' },
]

const bottomNavItems = [
  { key: 'Dashboard', icon: HomeOutline, label: 'Trang chủ', path: '/' },
  { key: 'Transactions', icon: WalletOutline, label: 'Giao dịch', path: '/transactions' },
  { key: 'AddTransaction', icon: AddCircleOutline, label: 'Thêm', path: '/transactions/new', fab: true },
  { key: 'Groups', icon: PeopleOutline, label: 'Nhóm', path: '/groups' },
  { key: 'Reports', icon: StatsChartOutline, label: 'Báo cáo', path: '/reports' },
]

const activeKey = computed(() => route.name as string)

function navigate(path: string) {
  if (path === '/transactions/new') {
    if (route.name === 'GroupDetail' && route.params.id) {
      router.push(`/transactions/new?groupId=${route.params.id}`)
      return
    }
  }
  router.push(path)
}

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-layout">
    <!-- Mobile Header -->
    <header class="mobile-header ef-hide-desktop">
      <div class="mobile-header__brand" @click="navigate('/')">
        <img src="/logo-light.svg" alt="ExpenseFlow Logo" class="mobile-header__logo" />
      </div>
      <div class="mobile-header__actions">
        <!-- Notification with Badge -->
        <a class="mobile-header__action" @click="navigate('/notifications')">
          <n-badge v-if="notifs.unreadCount > 0" :value="notifs.unreadCount" :max="99" :offset="[-4, 4]">
            <n-icon :size="24" color="var(--ef-text-secondary)"><NotificationsOutline /></n-icon>
          </n-badge>
          <n-icon v-else :size="24" color="var(--ef-text-secondary)"><NotificationsOutline /></n-icon>
        </a>
        <!-- Profile/Account Avatar -->
        <div class="mobile-header__avatar" @click="navigate('/profile')">
          <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="Avatar" class="avatar-img-small" />
          <span v-else>{{ auth.displayName?.charAt(0)?.toUpperCase() || 'U' }}</span>
        </div>
      </div>
    </header>

    <!-- Desktop Sidebar -->
    <aside class="sidebar ef-hide-mobile">
      <div class="sidebar__brand" @click="navigate('/')">
        <img src="/logo-light.svg" alt="ExpenseFlow Logo" class="sidebar__logo-img" />
      </div>

      <nav class="sidebar__nav">
        <a
          v-for="item in sidebarItems"
          :key="item.key"
          class="sidebar__item"
          :class="{ 'sidebar__item--active': activeKey === item.key }"
          @click="navigate(item.path)"
        >
          <n-icon :size="20"><component :is="item.icon" /></n-icon>
          <span>{{ item.label }}</span>
          <n-badge v-if="item.badge && notifs.unreadCount > 0" :value="notifs.unreadCount" :max="99" class="sidebar__badge" />
        </a>
      </nav>

      <div class="sidebar__footer">
        <div class="sidebar__user">
          <div class="sidebar__avatar">
            <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="Avatar" class="avatar-img-small" />
            <span v-else>{{ auth.displayName?.charAt(0)?.toUpperCase() }}</span>
          </div>
          <div class="sidebar__user-info">
            <div class="sidebar__user-name">{{ auth.displayName }}</div>
            <div class="sidebar__user-email">{{ auth.user?.email }}</div>
          </div>
        </div>
        <a class="sidebar__item sidebar__item--logout" @click="handleLogout">
          <n-icon :size="20"><LogOutOutline /></n-icon>
          <span>Đăng xuất</span>
        </a>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="ef-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Mobile Bottom Nav -->
    <nav class="bottom-nav ef-hide-desktop">
      <a
        v-for="item in bottomNavItems"
        :key="item.key"
        class="bottom-nav__item"
        :class="{ 'bottom-nav__item--active': activeKey === item.key, 'bottom-nav__item--fab': item.fab }"
        @click="navigate(item.path)"
      >
        <div v-if="item.fab" class="bottom-nav__fab">
          <n-icon :size="28"><component :is="item.icon" /></n-icon>
        </div>
        <template v-else>
          <n-icon :size="22"><component :is="item.icon" /></n-icon>
          <span class="bottom-nav__label">{{ item.label }}</span>
        </template>
      </a>
    </nav>
  </div>
</template>

<style scoped>
/* ─── Layout Grid ──────────────────────────────────────────────────────── */
.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 24px;
  padding-top: calc(56px + 16px);
  padding-bottom: calc(var(--ef-bottom-nav-height) + 80px);
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

/* ─── Desktop Sidebar ──────────────────────────────────────────────────── */
.sidebar {
  width: var(--ef-sidebar-width);
  background: var(--ef-surface);
  border-right: 1px solid var(--ef-border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  padding: 24px 16px;
  box-shadow: 1px 0 10px rgba(0,0,0,0.02);
}

.sidebar__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 12px 40px;
  cursor: pointer;
}

.sidebar__logo-img {
  max-width: 180px;
  height: auto;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.sidebar__logo-img:hover {
  transform: scale(1.05);
}

.sidebar__nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: var(--ef-radius-sm);
  cursor: pointer;
  color: var(--ef-text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.25s ease;
  text-decoration: none;
  position: relative;
}
.sidebar__item:hover {
  background: var(--ef-surface-hover);
  color: var(--ef-text);
  transform: translateX(4px);
}
.sidebar__item--active {
  background: var(--ef-primary-light);
  color: var(--ef-primary);
  font-weight: 600;
}
.sidebar__item--active::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 10%;
  bottom: 10%;
  width: 4px;
  background: var(--ef-primary);
  border-radius: 0 4px 4px 0;
}
.sidebar__item--logout { color: var(--ef-danger); margin-top: 8px; }
.sidebar__item--logout:hover { background: var(--ef-danger-light); transform: none; }

.sidebar__badge { margin-left: auto; }

.sidebar__footer {
  border-top: 1px solid var(--ef-border-light);
  padding-top: 20px;
  margin-top: auto;
}

.sidebar__user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 16px;
}

.sidebar__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ef-primary), #3B82F6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(6, 182, 212, 0.2);
}

.sidebar__user-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ef-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
.sidebar__user-email {
  font-size: 0.75rem;
  color: var(--ef-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

/* ─── Mobile Bottom Nav (Glassmorphism) ────────────────────────────────── */
.bottom-nav {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  height: var(--ef-bottom-nav-height);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--ef-radius-xl);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 200;
  padding: 0 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 6px;
  color: var(--ef-text-tertiary);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;
  flex: 1;
  min-width: 0;
}
.bottom-nav__item:active {
  transform: scale(0.95);
}
.bottom-nav__item--active {
  color: var(--ef-primary);
}
.bottom-nav__item--active .bottom-nav__label {
  font-weight: 700;
}

.bottom-nav__label {
  font-size: 0.65rem;
  font-weight: 500;
  transition: font-weight 0.2s;
  white-space: nowrap;
}

.bottom-nav__item--fab {
  flex: 0 0 auto;
  padding: 0 8px;
}

.bottom-nav__fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ef-primary), #3B82F6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -30px;
  box-shadow: 0 8px 24px rgba(6, 182, 212, 0.4);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
}
.bottom-nav__fab:active {
  transform: scale(0.9) translateY(4px);
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
}

/* ─── Desktop adjustments ──────────────────────────────────────────────── */
@media (min-width: 769px) {
  .sidebar ~ .main-content {
    margin-left: var(--ef-sidebar-width);
  }
  .main-content {
    padding: 40px 48px;
  }
}

/* ─── Mobile Header ────────────────────────────────────────────────── */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--ef-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 200;
}

.mobile-header__brand {
  cursor: pointer;
  display: flex;
  align-items: center;
}

.mobile-header__logo {
  height: 28px;
  width: auto;
}

.mobile-header__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mobile-header__action {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-header__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ef-primary), #3B82F6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.2);
}

.avatar-img-small {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
</style>
