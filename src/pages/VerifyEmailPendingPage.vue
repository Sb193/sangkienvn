<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, NIcon } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { MailOutline, LogOutOutline, CheckmarkCircleOutline, RefreshOutline } from '@vicons/ionicons5'
import api from '@/services/api'

const authStore = useAuthStore()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const cooldown = ref(0)
let timerInterval: any = null

const userEmail = computed(() => authStore.user?.email || 'email của bạn')

// Check for existing cooldown on mount
onMounted(() => {
  const nextResendAllowed = localStorage.getItem('nextResendAllowed')
  if (nextResendAllowed) {
    const remaining = Math.ceil((parseInt(nextResendAllowed) - Date.now()) / 1000)
    if (remaining > 0) {
      cooldown.value = remaining
      startTimer()
    }
  }
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

function startTimer() {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0) {
      clearInterval(timerInterval)
      localStorage.removeItem('nextResendAllowed')
    }
  }, 1000)
}

async function handleResend() {
  if (cooldown.value > 0 || loading.value) return
  loading.value = true
  
  try {
    await api.post('/auth/resend-verification')
    message.success('Đã gửi lại email xác thực thành công! ✉️')
    
    // Set 60 seconds cooldown
    const nextAllowed = Date.now() + 60 * 1000
    localStorage.setItem('nextResendAllowed', nextAllowed.toString())
    cooldown.value = 60
    startTimer()
  } catch (err: any) {
    const errMsg = err.response?.data?.error?.message || err.message || 'Gửi lại thất bại'
    message.error(`Không thể gửi lại email: ${errMsg}`)
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

async function handleCheckStatus() {
  loading.value = true
  try {
    await authStore.fetchProfile()
    if (authStore.user?.email_verified_at) {
      message.success('Tài khoản đã được xác thực! 🎉')
      router.push('/')
    } else {
      message.warning('Tài khoản vẫn chưa được xác thực. Vui lòng kiểm tra email của bạn.')
    }
  } catch (err) {
    message.error('Không thể kiểm tra trạng thái xác thực.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-card ef-card">
        <div class="auth-header">
          <div class="auth-logo-wrapper">
            <n-icon class="auth-logo" :size="36" color="var(--ef-primary)"><MailOutline /></n-icon>
          </div>
          <h1 class="auth-title">Xác thực tài khoản</h1>
          <p class="auth-subtitle">Chúng tôi cần xác thực địa chỉ email của bạn</p>
        </div>

        <div class="status-container">
          <p class="status-text">
            Một liên kết xác thực đã được gửi tới địa chỉ email:<br>
            <strong class="email-highlight">{{ userEmail }}</strong>
          </p>
          
          <p class="status-text-sub">
            Vui lòng mở hộp thư đến (hoặc thư rác) và click vào đường dẫn xác thực để kích hoạt tài khoản của bạn.
          </p>

          <div class="action-buttons">
            <button 
              @click="handleCheckStatus" 
              class="auth-btn ef-btn ef-btn-primary ef-btn-block" 
              :disabled="loading"
            >
              <n-icon :size="18"><CheckmarkCircleOutline /></n-icon>
              <span>Tôi đã xác thực xong</span>
            </button>

            <button 
              @click="handleResend" 
              class="auth-btn ef-btn ef-btn-secondary ef-btn-block" 
              :disabled="cooldown > 0 || loading"
            >
              <n-icon :size="18" :class="{ 'animate-spin': loading }"><RefreshOutline /></n-icon>
              <span v-if="cooldown > 0">Gửi lại sau ({{ cooldown }}s)</span>
              <span v-else>Gửi lại email xác thực</span>
            </button>
          </div>
        </div>

        <div class="auth-footer-custom">
          <button @click="handleLogout" class="logout-btn">
            <n-icon :size="16"><LogOutOutline /></n-icon>
            <span>Đăng xuất / Sử dụng tài khoản khác</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(circle at 10% 20%, rgba(218, 228, 253, 0.4) 0%, rgba(244, 247, 254, 0.6) 90%),
              linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
  position: relative;
  overflow: hidden;
}

.auth-page::before,
.auth-page::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.6;
}

.auth-page::before {
  width: 300px;
  height: 300px;
  background: rgba(59, 130, 246, 0.15);
  top: -50px;
  right: -50px;
}

.auth-page::after {
  width: 400px;
  height: 400px;
  background: rgba(139, 92, 246, 0.12);
  bottom: -100px;
  left: -100px;
}

.auth-container {
  width: 100%;
  max-width: 480px;
  z-index: 1;
  position: relative;
  animation: cardFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.auth-card {
  padding: 48px 40px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.05),
              0 1px 3px rgba(0, 0, 0, 0.02);
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.auth-logo-wrapper {
  display: inline-flex;
  padding: 12px;
  border-radius: 16px;
  background: var(--ef-primary-alpha);
  margin-bottom: 16px;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 8px;
  letter-spacing: -0.3px;
}

.auth-subtitle {
  color: #64748b;
  font-size: 0.95rem;
}

.status-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.status-text {
  color: #334155;
  font-size: 1rem;
  line-height: 1.6;
}

.email-highlight {
  color: var(--ef-primary);
  font-size: 1.05rem;
  word-break: break-all;
}

.status-text-sub {
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.5;
}

.action-buttons {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.auth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  font-weight: 600;
}

.auth-footer-custom {
  margin-top: 32px;
  display: flex;
  justify-content: center;
}

.logout-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 0.88rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.logout-btn:hover {
  color: var(--ef-danger);
  text-decoration: underline;
}

@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
