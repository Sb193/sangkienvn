<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import api from '@/services/api'

const router = useRouter()
const message = useMessage()

// States
const step = ref(1) // 1: Enter email, 2: Enter OTP code & new password
const email = ref('')
const token = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const errors = ref({
  email: '',
  token: '',
  newPassword: '',
  confirmPassword: '',
  server: '',
})

function clearError(field: keyof typeof errors.value) {
  errors.value[field] = ''
  errors.value.server = ''
}

function validateEmail() {
  if (!email.value.trim()) {
    errors.value.email = 'Vui lòng nhập Email'
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errors.value.email = 'Email không đúng định dạng'
    return false
  }
  return true
}

function validateResetForm() {
  let isValid = true

  if (!token.value.trim() || token.value.length < 6) {
    errors.value.token = 'Mã xác thực gồm 6 chữ số'
    isValid = false
  }
  if (!newPassword.value) {
    errors.value.newPassword = 'Vui lòng nhập mật khẩu mới'
    isValid = false
  } else if (newPassword.value.length < 8) {
    errors.value.newPassword = 'Mật khẩu phải chứa ít nhất 8 ký tự'
    isValid = false
  }
  if (newPassword.value !== confirmPassword.value) {
    errors.value.confirmPassword = 'Mật khẩu xác nhận không trùng khớp'
    isValid = false
  }

  return isValid
}

async function handleRequestCode() {
  if (!validateEmail()) return
  loading.value = true
  errors.value.server = ''

  try {
    await api.post('/auth/forgot-password', { email: email.value.toLowerCase().trim() })
    message.success('Mã xác thực đã được gửi tới email của bạn! ✉️')
    step.value = 2
  } catch (err: any) {
    errors.value.server = err.response?.data?.error?.message || err.message || 'Gửi mã thất bại'
    message.error('Gửi mã xác thực thất bại.')
  } finally {
    loading.value = false
  }
}

async function handleResetPassword() {
  if (!validateResetForm()) return
  loading.value = true
  errors.value.server = ''

  try {
    await api.post('/auth/reset-password', {
      token: token.value.trim(),
      newPassword: newPassword.value,
    })
    message.success('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay 🎉')
    router.push('/login')
  } catch (err: any) {
    errors.value.server = err.response?.data?.error?.message || err.message || 'Đặt lại mật khẩu thất bại'
    message.error('Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại mã xác thực.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-card ef-card">
        <!-- Header -->
        <div class="auth-header">
          <img src="/logo-light.svg" alt="ExpenseFlow Logo" class="auth-logo" />
          <h1 class="auth-title">Quên mật khẩu</h1>
          <p class="auth-subtitle">
            {{ step === 1 ? 'Nhập email để nhận mã OTP khôi phục tài khoản' : 'Nhập mã OTP và thiết lập mật khẩu mới' }}
          </p>
        </div>

        <!-- Server Error Alert -->
        <div v-if="errors.server" class="auth-alert error-alert animate-shake">
          <span class="alert-icon">⚠️</span>
          <span class="alert-message">{{ errors.server }}</span>
        </div>

        <!-- Step 1: Send Code -->
        <form v-if="step === 1" @submit.prevent="handleRequestCode" class="auth-form">
          <div class="form-group" :class="{ 'has-error': errors.email }">
            <label class="form-label">Email tài khoản</label>
            <div class="input-wrapper">
              <span class="input-icon">✉️</span>
              <input 
                v-model="email" 
                type="text" 
                placeholder="ten@email.com" 
                class="form-input"
                @input="clearError('email')"
              />
            </div>
            <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
          </div>

          <button type="submit" class="auth-btn ef-btn ef-btn-primary ef-btn-block" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            <span v-else>Gửi mã xác nhận</span>
          </button>
        </form>

        <!-- Step 2: Input OTP & New Password -->
        <form v-else @submit.prevent="handleResetPassword" class="auth-form">
          <div class="form-group" :class="{ 'has-error': errors.token }">
            <label class="form-label">Mã xác thực (OTP)</label>
            <div class="input-wrapper">
              <span class="input-icon">🔑</span>
              <input 
                v-model="token" 
                type="text" 
                maxlength="6"
                placeholder="123456" 
                class="form-input code-input"
                @input="clearError('token')"
              />
            </div>
            <span v-if="errors.token" class="error-text">{{ errors.token }}</span>
          </div>

          <div class="form-group" :class="{ 'has-error': errors.newPassword }">
            <label class="form-label">Mật khẩu mới</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input 
                v-model="newPassword" 
                type="password" 
                placeholder="Tối thiểu 8 ký tự" 
                class="form-input"
                @input="clearError('newPassword')"
              />
            </div>
            <span v-if="errors.newPassword" class="error-text">{{ errors.newPassword }}</span>
          </div>

          <div class="form-group" :class="{ 'has-error': errors.confirmPassword }">
            <label class="form-label">Xác nhận mật khẩu mới</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input 
                v-model="confirmPassword" 
                type="password" 
                placeholder="Nhập lại mật khẩu mới" 
                class="form-input"
                @input="clearError('confirmPassword')"
              />
            </div>
            <span v-if="errors.confirmPassword" class="error-text">{{ errors.confirmPassword }}</span>
          </div>

          <button type="submit" class="auth-btn ef-btn ef-btn-primary ef-btn-block" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            <span v-else>Đặt lại mật khẩu</span>
          </button>
        </form>

        <p class="auth-footer">
          Nhớ mật khẩu? <router-link to="/login">Đăng nhập</router-link>
        </p>
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
  max-width: 440px;
  z-index: 1;
  position: relative;
  animation: cardFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.auth-card {
  padding: 40px 36px;
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
  margin-bottom: 32px;
}

.auth-logo {
  height: 44px;
  margin-bottom: 20px;
}

.auth-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.auth-subtitle {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.5;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  font-size: 1.1rem;
}

.form-input {
  width: 100%;
  padding: 12px 16px 12px 42px;
  border: 1.5px solid #e2e8f0;
  background: white;
  border-radius: 12px;
  font-size: 0.95rem;
  color: #1e293b;
  transition: all 0.2s ease;
  outline: none;
}

.form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.code-input {
  letter-spacing: 4px;
  font-weight: bold;
  font-size: 1.2rem;
}

.has-error .form-input {
  border-color: #ef4444;
}

.has-error .form-input:focus {
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

.error-text {
  font-size: 0.8rem;
  color: #ef4444;
  font-weight: 500;
}

.auth-btn {
  padding: 13px;
  font-weight: 600;
  font-size: 0.95rem;
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  width: 100%;
}

.auth-btn:active {
  transform: scale(0.98);
}

.auth-alert {
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 24px;
  font-size: 0.88rem;
  line-height: 1.4;
}

.error-alert {
  background: #fef2f2;
  border: 1px solid #fee2e2;
  color: #991b1b;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

.auth-footer {
  text-align: center;
  margin-top: 32px;
  font-size: 0.9rem;
  color: #64748b;
}

.auth-footer a {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 600;
}

.auth-footer a:hover {
  text-decoration: underline;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
