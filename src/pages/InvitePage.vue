<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NResult } from 'naive-ui'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const token = route.params.token as string

const loading = ref(true)
const success = ref(false)
const errorMsg = ref('')
const groupId = ref('')

onMounted(async () => {
  try {
    const { data } = await api.post('/groups/join-token', { token })
    success.value = true
    groupId.value = data.data.group.id
    setTimeout(() => {
      router.push(`/groups/${groupId.value}`)
    }, 2000)
  } catch (err: any) {
    success.value = false
    errorMsg.value = err.response?.data?.error?.message || 'Liên kết mời không hợp lệ hoặc đã hết hạn.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="invite-page-container">
    <div class="invite-card-wrapper ef-card">
      <n-spin :show="loading" size="large" description="Đang gia nhập nhóm chi tiêu...">
        <div v-if="!loading">
          <n-result
            v-if="success"
            status="success"
            title="Gia nhập nhóm thành công!"
            description="Đang chuyển hướng bạn đến trang chi tiết nhóm..."
          />
          <n-result
            v-else
            status="error"
            title="Gia nhập thất bại"
            :description="errorMsg"
          >
            <template #footer>
              <button class="ef-btn ef-btn-primary" @click="router.push('/')">Về trang chủ</button>
            </template>
          </n-result>
        </div>
      </n-spin>
    </div>
  </div>
</template>

<style scoped>
.invite-page-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 16px;
}
.invite-card-wrapper {
  width: 100%;
  max-width: 480px;
  padding: 40px;
  text-align: center;
  background: var(--ef-surface);
  border-radius: var(--ef-radius-lg);
  box-shadow: var(--ef-shadow-lg);
}
</style>
