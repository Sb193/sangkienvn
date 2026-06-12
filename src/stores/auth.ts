import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { User, LoginPayload, RegisterPayload } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const displayName = computed(() => user.value?.full_name || user.value?.email || '')

  async function login(payload: LoginPayload) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/login', payload)
      const { accessToken, refreshToken, user: userData } = data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      user.value = userData
    } finally {
      loading.value = false
    }
  }

  async function register(payload: RegisterPayload) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/register', payload)
      // Register doesn't return a token, redirect to login
      return data.data
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    try {
      const { data } = await api.get('/auth/profile')
      user.value = data.data
    } catch {
      user.value = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  }

  async function updateProfile(fullName: string, avatarUrl?: string | null) {
    loading.value = true
    try {
      const { data } = await api.put('/auth/profile', { fullName, avatarUrl })
      user.value = data.data
      return data.data
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      await api.post('/auth/logout', { refreshToken })
    } catch { /* ignore */ }
    user.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  function init() {
    const token = localStorage.getItem('accessToken')
    if (token) fetchProfile()
  }

  return { user, loading, isAuthenticated, displayName, login, register, fetchProfile, updateProfile, logout, init }
})
