<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { NIcon } from 'naive-ui'
import { CheckmarkCircleOutline, WarningOutline } from '@vicons/ionicons5'
import api from '@/services/api'

const route = useRoute()

// States: 'verifying' | 'success' | 'error'
const status = ref<'verifying' | 'success' | 'error'>('verifying')
const errorMessage = ref('')

onMounted(async () => {
  const token = route.query.token as string

  if (!token) {
    status.value = 'error'
    errorMessage.value = 'Không tìm thấy mã xác thực email.'
    return
  }

  try {
    await api.post('/auth/verify-email', { token })
    status.value = 'success'
  } catch (err: any) {
    status.value = 'error'
    errorMessage.value = err.response?.data?.error?.message || err.message || 'Xác thực tài khoản thất bại'
  }
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-card ef-card">
        <!-- Logo -->
        <div class="auth-header">
          <img src="/logo-light.svg" alt="ExpenseFlow Logo" class="auth-logo" />
        </div>

        <!-- Verifying State -->
        <div v-if="status === 'verifying'" class="status-container">
          <div class="spinner-large"></div>
          <h2 class="status-title">Đang xác thực tài khoản</h2>
          <p class="status-text">Vui lòng đợi trong giây lát, chúng tôi đang xử lý xác thực email của bạn...</p>
        </div>

        <!-- Success State -->
        <div v-else-if="status === 'success'" class="status-container animate-scale">
          <div class="status-icon success-icon" style="color: var(--ef-success); display: flex; align-items: center; justify-content: center;">
            <n-icon :size="56"><CheckmarkCircleOutline /></n-icon>
          </div>
          <h2 class="status-title">Xác thực thành công! 🎉</h2>
          <p class="status-text">Tài khoản của bạn đã được xác thực thành công. Bạn đã có thể bắt đầu sử dụng đầy đủ các tính năng của ExpenseFlow.</p>
          <router-link to="/login" class="action-btn ef-btn ef-btn-primary">Đăng nhập ngay</router-link>
        </div>

        <!-- Error State -->
        <div v-else class="status-container animate-scale">
          <div class="status-icon error-icon" style="color: var(--ef-danger); display: flex; align-items: center; justify-content: center;">
            <n-icon :size="56"><WarningOutline /></n-icon>
          </div>
          <h2 class="status-title">Xác thực thất bại</h2>
          <p class="status-text error-msg">{{ errorMessage }}</p>
          <p class="status-text">Liên kết xác thực có thể đã hết hạn hoặc không hợp lệ. Vui lòng kiểm tra lại email hoặc liên hệ quản trị viên.</p>
          <router-link to="/login" class="action-btn ef-btn ef-btn-secondary">Quay lại Đăng nhập</router-link>
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

.auth-logo {
  height: 44px;
}

.status-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.spinner-large {
  width: 56px;
  height: 56px;
  border: 4px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s linear infinite;
  margin-bottom: 24px;
}

.status-icon {
  font-size: 3.5rem;
  margin-bottom: 24px;
}

.status-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 12px;
  letter-spacing: -0.3px;
}

.status-text {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 24px;
}

.error-msg {
  color: #ef4444;
  font-weight: 600;
  background: #fef2f2;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #fee2e2;
  display: inline-block;
  margin-bottom: 16px;
}

.action-btn {
  width: 100%;
  padding: 13px;
  font-weight: 600;
  font-size: 0.95rem;
  border-radius: 12px;
  text-decoration: none;
  display: inline-block;
  box-sizing: border-box;
  text-align: center;
}

.ef-btn-secondary {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.ef-btn-secondary:hover {
  background-color: #e2e8f0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-scale {
  animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
