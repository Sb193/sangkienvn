<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const message = useMessage()

const form = ref({ fullName: '', email: '', password: '' })
const errors = ref({ fullName: '', email: '', password: '', server: '' })
const showPassword = ref(false)

function clearError(field: 'fullName' | 'email' | 'password') {
  errors.value[field] = ''
  errors.value.server = ''
}

function validateForm() {
  let isValid = true

  // Full Name check
  if (!form.value.fullName.trim()) {
    errors.value.fullName = 'Vui lòng nhập họ và tên của bạn'
    isValid = false
  } else if (form.value.fullName.trim().length < 2) {
    errors.value.fullName = 'Họ và tên phải có ít nhất 2 ký tự'
    isValid = false
  } else {
    errors.value.fullName = ''
  }
  
  // Email check
  if (!form.value.email.trim()) {
    errors.value.email = 'Vui lòng nhập Email'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Email không đúng định dạng (ví dụ: name@domain.com)'
    isValid = false
  } else {
    errors.value.email = ''
  }

  // Password check
  if (!form.value.password) {
    errors.value.password = 'Vui lòng nhập mật khẩu'
    isValid = false
  } else if (form.value.password.length < 8) {
    errors.value.password = 'Mật khẩu phải chứa ít nhất 8 ký tự'
    isValid = false
  } else {
    errors.value.password = ''
  }

  return isValid
}

async function handleRegister() {
  errors.value.server = ''
  if (!validateForm()) return

  try {
    await auth.register(form.value)
    message.success('Đăng ký tài khoản thành công! 🎉')
    router.push('/')
  } catch (err: any) {
    let errMsg = err.response?.data?.error?.message || err.message || 'Đăng ký thất bại'
    
    if (errMsg === 'Email is already registered') {
      errors.value.server = 'Email này đã được sử dụng bởi một tài khoản khác. Bạn có muốn đăng nhập không?'
    } else if (errMsg === 'Email, password, and fullName are required') {
      errors.value.server = 'Vui lòng điền đầy đủ các thông tin.'
    } else {
      errors.value.server = `Lỗi hệ thống: ${errMsg}`
    }
    message.error('Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.')
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-card ef-card">
        <div class="auth-header">
          <div class="auth-logo-wrapper">
            <span class="auth-logo">💸</span>
          </div>
          <h1 class="auth-title">Đăng ký tài khoản</h1>
          <p class="auth-subtitle">Bắt đầu theo dõi và quản lý chi tiêu hiệu quả</p>
        </div>

        <!-- Server Error Alert -->
        <div v-if="errors.server" class="auth-alert error-alert animate-shake">
          <span class="alert-icon">⚠️</span>
          <span class="alert-message">{{ errors.server }}</span>
        </div>

        <form @submit.prevent="handleRegister" class="auth-form">
          <div class="form-group" :class="{ 'has-error': errors.fullName }">
            <label class="form-label">Họ và tên</label>
            <div class="input-wrapper">
              <span class="input-icon">👤</span>
              <input 
                v-model="form.fullName" 
                type="text" 
                placeholder="Nguyễn Văn A" 
                class="form-input"
                @input="clearError('fullName')"
              />
            </div>
            <span v-if="errors.fullName" class="error-text">{{ errors.fullName }}</span>
          </div>

          <div class="form-group" :class="{ 'has-error': errors.email }">
            <label class="form-label">Email</label>
            <div class="input-wrapper">
              <span class="input-icon">✉️</span>
              <input 
                v-model="form.email" 
                type="text" 
                placeholder="ten@email.com" 
                class="form-input"
                @input="clearError('email')"
              />
            </div>
            <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
          </div>

          <div class="form-group" :class="{ 'has-error': errors.password }">
            <label class="form-label">Mật khẩu</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input 
                v-model="form.password" 
                :type="showPassword ? 'text' : 'password'" 
                placeholder="Tối thiểu 8 ký tự" 
                class="form-input"
                @input="clearError('password')"
              />
              <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                {{ showPassword ? '👁️' : '🙈' }}
              </button>
            </div>
            <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
          </div>

          <button type="submit" class="auth-btn ef-btn ef-btn-primary ef-btn-block" :disabled="auth.loading">
            <span v-if="auth.loading" class="spinner"></span>
            <span v-else>Đăng ký tài khoản</span>
          </button>
        </form>

        <p class="auth-footer">
          Đã có tài khoản? <router-link to="/login">Đăng nhập</router-link>
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

/* Background decorative circles */
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

.auth-logo-wrapper {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.8);
}

.auth-logo {
  font-size: 2rem;
}

.auth-title {
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, var(--ef-primary), #6366F1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.auth-subtitle {
  color: var(--ef-text-secondary);
  font-size: 0.95rem;
  margin-top: 6px;
}

/* Alert styling */
.auth-alert {
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 24px;
  font-size: 0.88rem;
  line-height: 1.4;
}

.error-alert {
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #DC2626;
}

.alert-icon {
  font-size: 1.1rem;
  line-height: 1;
}

/* Form inputs */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--ef-text-primary);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: #9CA3AF;
  font-size: 1.1rem;
  pointer-events: none;
}

.form-input {
  width: 100%;
  padding: 12px 14px 12px 42px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  font-size: 0.95rem;
  font-family: inherit;
  transition: all 0.2s ease-in-out;
  outline: none;
}

.form-input:focus {
  background: #FFFFFF;
  border-color: var(--ef-primary);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.has-error .form-input {
  border-color: var(--ef-danger);
  background: rgba(239, 68, 68, 0.01);
}

.has-error .form-input:focus {
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

.toggle-password {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #9CA3AF;
  font-size: 1.1rem;
}

.error-text {
  font-size: 0.8rem;
  color: var(--ef-danger);
  font-weight: 500;
  margin-top: 2px;
}

/* Button */
.auth-btn {
  margin-top: 8px;
  height: 48px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  color: white;
  background-color: var(--ef-primary);
}

.auth-btn:hover {
  background-color: #2563EB;
}

.auth-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-footer {
  text-align: center;
  margin-top: 28px;
  font-size: 0.9rem;
  color: var(--ef-text-secondary);
}

.auth-footer a {
  color: var(--ef-primary);
  font-weight: 600;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}

/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #FFF;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Shake animation for errors */
.animate-shake {
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
</style>
