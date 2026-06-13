import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import type { Group, GroupMember } from '@/types'

export const useGroupsStore = defineStore('groups', () => {
  const groups = ref<Group[]>([])
  const currentGroup = ref<Group | null>(null)
  const members = ref<GroupMember[]>([])
  const loading = ref(false)

  async function fetchGroups() {
    loading.value = true
    try {
      const { data } = await api.get('/groups')
      groups.value = data.data
    } finally {
      loading.value = false
    }
  }

  async function fetchGroupDetail(id: string) {
    const { data } = await api.get(`/groups/${id}`)
    currentGroup.value = data.data.group
    members.value = data.data.members
  }

  async function createGroup(payload: { name: string; description?: string }) {
    const { data } = await api.post('/groups', payload)
    await fetchGroups()
    return data.data
  }

  async function joinByCode(joinCode: string) {
    const { data } = await api.post('/groups/join', { code: joinCode })
    await fetchGroups()
    return data.data
  }

  async function updateGroup(id: string, payload: { name?: string; description?: string; avatarUrl?: string | null }) {
    const { data } = await api.patch(`/groups/${id}`, payload)
    currentGroup.value = data.data
    const idx = groups.value.findIndex(g => g.id === id)
    if (idx !== -1) {
      groups.value[idx] = data.data
    }
    return data.data
  }

  async function leaveGroup(id: string) {
    await api.post(`/groups/${id}/leave`)
    groups.value = groups.value.filter(g => g.id !== id)
    if (currentGroup.value?.id === id) currentGroup.value = null
  }

  async function deleteGroup(id: string) {
    await api.delete(`/groups/${id}`)
    groups.value = groups.value.filter(g => g.id !== id)
    if (currentGroup.value?.id === id) currentGroup.value = null
  }

  return { groups, currentGroup, members, loading, fetchGroups, fetchGroupDetail, createGroup, joinByCode, updateGroup, leaveGroup, deleteGroup }
})
