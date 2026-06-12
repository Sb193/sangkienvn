import axios from 'axios'
import type { ApiResponse } from '@/types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8787/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request Interceptor: Attach Access Token ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response Interceptor: Auto-refresh on 401 ───────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (v: unknown) => void
  reject: (e: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null

  try {
    const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${api.defaults.baseURL}/auth/refresh`,
      { refreshToken }
    )
    const { accessToken, refreshToken: newRefreshToken } = data.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', newRefreshToken)
    return accessToken
  } catch (err: any) {
    if (err.response && (err.response.status === 401 || err.response.status === 400)) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      return 'AUTH_EXPIRED'
    }
    throw err
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch((err) => Promise.reject(err))
      }

      isRefreshing = true
      try {
        const newToken = await tryRefreshToken()
        isRefreshing = false

        if (newToken === 'AUTH_EXPIRED' || !newToken) {
          processQueue(new Error('Session expired'), null)
          window.location.href = '/login'
          return Promise.reject(error)
        }

        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        isRefreshing = false
        processQueue(refreshError, null)
        // If it's a server/network error, do not redirect to login. Simply reject.
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
