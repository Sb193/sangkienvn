import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { Notification } from '@/types'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const loading = ref(false)

  const unreadCount = computed(() => notifications.value.filter((n) => n.is_read === 0).length)

  async function fetchNotifications() {
    loading.value = true
    try {
      const { data } = await api.get('/notifications')
      notifications.value = data.data
    } finally {
      loading.value = false
    }
  }

  async function markAllAsRead() {
    await api.post('/notifications/read-all')
    notifications.value = notifications.value.map((n) => ({ ...n, is_read: 1 }))
  }

  async function markAsRead(id: string) {
    await api.patch(`/notifications/${id}/read`)
    const notif = notifications.value.find((n) => n.id === id)
    if (notif) notif.is_read = 1
  }

  return { notifications, loading, unreadCount, fetchNotifications, markAllAsRead, markAsRead }
})
