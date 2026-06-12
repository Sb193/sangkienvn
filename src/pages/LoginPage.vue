<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NInput, NButton, NForm, NFormItem, useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const message = useMessage()

const form = ref({ email: '', password: '' })

async function handleLogin() {
  try {
    await auth.login(form.value)
    message.success('Đăng nhập thành công!')
    router.push('/')
  } catch (err: any) {
    message.error(err.response?.data?.error?.message || 'Đăng nhập thất bại')
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card ef-card">
      <div class="auth-header">
        <span class="auth-logo">💸</span>
        <h1 class="auth-title">ExpenseFlow</h1>
        <p class="auth-subtitle">Đăng nhập để quản lý chi tiêu</p>
      </div>

      <n-form @submit.prevent="handleLogin">
        <n-form-item label="Email">
          <n-input v-model:value="form.email" type="text" placeholder="you@email.com" size="large" />
        </n-form-item>
        <n-form-item label="Mật khẩu">
          <n-input v-model:value="form.password" type="password" show-password-on="mousedown" placeholder="••••••••" size="large" />
        </n-form-item>
        <n-button type="primary" block size="large" :loading="auth.loading" attr-type="submit" class="auth-btn">
          Đăng nhập
        </n-button>
      </n-form>

      <p class="auth-footer">
        Chưa có tài khoản? <router-link to="/register">Đăng ký ngay</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #EEF2FF 0%, #DBEAFE 50%, #E0E7FF 100%);
}
.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 32px;
  border: none;
  box-shadow: var(--ef-shadow-lg);
}
.auth-header {
  text-align: center;
  margin-bottom: 32px;
}
.auth-logo { font-size: 2.5rem; }
.auth-title {
  font-size: 1.6rem;
  font-weight: 800;
  margin-top: 8px;
  background: linear-gradient(135deg, var(--ef-primary), #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.auth-subtitle {
  color: var(--ef-text-secondary);
  font-size: 0.9rem;
  margin-top: 4px;
}
.auth-btn {
  margin-top: 8px;
  font-weight: 600;
  border-radius: var(--ef-radius) !important;
}
.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 0.85rem;
  color: var(--ef-text-secondary);
}
</style>
