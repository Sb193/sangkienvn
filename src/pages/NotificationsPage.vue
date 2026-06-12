<script setup lang="ts">
import { onMounted } from 'vue'
import { NButton, NSpin, NEmpty } from 'naive-ui'
import { useNotificationsStore } from '@/stores/notifications'

const notifStore = useNotificationsStore()

onMounted(() => { notifStore.fetchNotifications() })

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  return `${Math.floor(h / 24)} ngày trước`
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="ef-page-title">Thông báo</h1>
      <n-button v-if="notifStore.unreadCount > 0" text type="primary" @click="notifStore.markAllAsRead()">Đánh dấu đã đọc tất cả</n-button>
    </div>

    <n-spin :show="notifStore.loading">
      <n-empty v-if="notifStore.notifications.length === 0" description="Không có thông báo" />
      <div v-else class="notif-list">
        <div
          v-for="n in notifStore.notifications"
          :key="n.id"
          class="notif-item ef-card"
          :class="{ 'notif-item--unread': !n.is_read }"
          @click="notifStore.markAsRead(n.id)"
        >
          <div class="notif-item__dot" v-if="!n.is_read"></div>
          <div class="notif-item__content">
            <div class="notif-item__title">{{ n.title }}</div>
            <div class="notif-item__body">{{ n.content }}</div>
            <div class="notif-item__time">{{ timeAgo(n.created_at) }}</div>
          </div>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; }
.notif-list { display: flex; flex-direction: column; gap: 6px; }
.notif-item { display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px; cursor: pointer; }
.notif-item--unread { border-left: 3px solid var(--ef-primary); background: var(--ef-primary-light); }
.notif-item__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ef-primary); margin-top: 6px; flex-shrink: 0; }
.notif-item__content { flex: 1; }
.notif-item__title { font-weight: 600; font-size: 0.9rem; }
.notif-item__body { font-size: 0.82rem; color: var(--ef-text-secondary); margin-top: 2px; line-height: 1.5; }
.notif-item__time { font-size: 0.72rem; color: var(--ef-text-tertiary); margin-top: 6px; }
</style>
