<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NInput, NIcon, useMessage, NSpin } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import api, { uploadApi } from '@/services/api'
import { 
  PersonOutline, MailOutline, CalendarOutline, PaperPlaneOutline, 
  LogOutOutline, PencilOutline, CloseOutline, CheckmarkOutline,
  GlobeOutline, CameraOutline
} from '@vicons/ionicons5'

const auth = useAuthStore()
const router = useRouter()
const message = useMessage()

const telegramStatus = ref<{ linked: boolean; telegramUsername: string | null; linkUrl: string } | null>(null)
const isEditingName = ref(false)
const editedName = ref('')
const savingName = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)

function triggerAvatarSelection() {
  fileInput.value?.click()
}

function compressImageToBlob(file: File, maxWidth = 256, maxHeight = 256, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            resolve(file)
          }
        }, 'image/jpeg', quality)
      }
      img.onerror = (err) => reject(err)
      img.src = e.target?.result as string
    }
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

async function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Limit avatar image size to 5MB
  if (file.size > 5 * 1024 * 1024) {
    message.error('Kích thước ảnh đại diện không vượt quá 5MB')
    return
  }

  uploadingAvatar.value = true
  try {
    const compressedBlob = await compressImageToBlob(file)
    const formData = new FormData()
    formData.append('file', compressedBlob, 'avatar.jpg')

    // Upload to Cloudinary via backend-render
    const { data: uploadRes } = await uploadApi.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    const cloudinaryUrl = uploadRes.data.url

    // Update user profile avatar URL in Worker database
    await auth.updateProfile(auth.user?.full_name || '', cloudinaryUrl)
    message.success('Đã cập nhật ảnh đại diện thành công qua Cloudinary! 🎉')
  } catch (err: any) {
    message.error(err.response?.data?.error?.message || 'Cập nhật ảnh đại diện thất bại')
  } finally {
    uploadingAvatar.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

onMounted(async () => {
  if (auth.user) {
    editedName.value = auth.user.full_name || ''
  }
  try {
    const { data } = await api.get('/settings/telegram')
    telegramStatus.value = data.data
  } catch {}
})

function startEdit() {
  editedName.value = auth.user?.full_name || ''
  isEditingName.value = true
}

function cancelEdit() {
  isEditingName.value = false
}

async function saveName() {
  if (!editedName.value.trim()) {
    message.warning('Tên không được bỏ trống')
    return
  }
  savingName.value = true
  try {
    await auth.updateProfile(editedName.value.trim())
    message.success('Đã cập nhật tên tài khoản! 🎉')
    isEditingName.value = false
  } catch (err: any) {
    message.error(err.response?.data?.error?.message || 'Cập nhật tên thất bại')
  } finally {
    savingName.value = false
  }
}

function openTelegramLink() {
  if (telegramStatus.value?.linkUrl) {
    window.open(telegramStatus.value.linkUrl, '_blank')
  }
}

async function unlinkTelegram() {
  try {
    await api.delete('/settings/telegram')
    message.success('Đã hủy liên kết Telegram')
    telegramStatus.value = { ...telegramStatus.value!, linked: false, telegramUsername: null }
  } catch (err: any) {
    message.error(err.response?.data?.error?.message || 'Hủy liên kết thất bại')
  }
}

async function handleLogout() {
  try {
    await auth.logout()
    message.success('Đăng xuất thành công!')
    router.push('/login')
  } catch {
    message.error('Đăng xuất thất bại')
  }
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="profile-page">
    <h1 class="ef-page-title">Cá nhân</h1>

    <!-- Avatar & Profile card -->
    <div class="ef-card profile-card">
      <div class="profile-header">
        <div class="profile-avatar-wrapper" @click="triggerAvatarSelection" title="Thay đổi ảnh đại diện">
          <div class="profile-avatar">
            <n-spin :show="uploadingAvatar" size="small" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
              <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="Avatar" class="avatar-image" />
              <span v-else>{{ auth.user?.full_name?.charAt(0)?.toUpperCase() || 'U' }}</span>
              <div class="avatar-overlay">
                <n-icon><CameraOutline /></n-icon>
              </div>
            </n-spin>
          </div>
          <div class="avatar-badge">✓</div>
        </div>
        <input 
          type="file" 
          ref="fileInput" 
          accept="image/*" 
          style="display: none" 
          @change="onFileSelected" 
        />
        
        <div class="profile-info-block">
          <div v-if="!isEditingName" class="name-display-row">
            <h2 class="profile-name">{{ auth.user?.full_name }}</h2>
            <button class="edit-btn" @click="startEdit" title="Sửa tên">
              <n-icon><PencilOutline /></n-icon>
            </button>
          </div>
          
          <div v-else class="name-edit-row">
            <n-input 
              v-model:value="editedName" 
              placeholder="Nhập họ và tên..." 
              size="medium"
              class="name-input"
              autofocus
              :loading="savingName"
              @keyup.enter="saveName"
            />
            <div class="edit-actions">
              <n-button type="primary" size="medium" circle @click="saveName" :loading="savingName">
                <template #icon><n-icon><CheckmarkOutline /></n-icon></template>
              </n-button>
              <n-button size="medium" circle @click="cancelEdit" :disabled="savingName">
                <template #icon><n-icon><CloseOutline /></n-icon></template>
              </n-button>
            </div>
          </div>
          
          <div class="profile-email">{{ auth.user?.email }}</div>
        </div>
      </div>
    </div>

    <!-- Account Details -->
    <div class="ef-card detail-card">
      <h3 class="card-section-title">Chi tiết tài khoản</h3>
      <div class="info-list">
        <div class="info-item">
          <div class="info-item__icon"><n-icon><MailOutline /></n-icon></div>
          <div class="info-item__content">
            <span class="info-item__label">Địa chỉ Email</span>
            <span class="info-item__value">{{ auth.user?.email }}</span>
          </div>
        </div>
        <div class="info-item">
          <div class="info-item__icon"><n-icon><GlobeOutline /></n-icon></div>
          <div class="info-item__content">
            <span class="info-item__label">Phương thức đăng nhập</span>
            <span class="info-item__value provider-tag">{{ auth.user?.provider || 'Email' }}</span>
          </div>
        </div>
        <div class="info-item">
          <div class="info-item__icon"><n-icon><CalendarOutline /></n-icon></div>
          <div class="info-item__content">
            <span class="info-item__label">Ngày tạo tài khoản</span>
            <span class="info-item__value">{{ formatDate(auth.user?.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Telegram Settings -->
    <div class="ef-card telegram-card">
      <div class="telegram-header">
        <div class="tg-icon-wrapper">
          <n-icon><PaperPlaneOutline /></n-icon>
        </div>
        <div>
          <h3 class="card-section-title" style="margin-bottom: 2px;">Liên kết Telegram</h3>
          <p class="tg-desc">Nhận thông báo giao dịch, biến động số dư và ngân sách qua Telegram bot</p>
        </div>
      </div>
      
      <div v-if="telegramStatus" class="tg-status-action">
        <div v-if="telegramStatus.linked" class="tg-status tg-status--linked">
          <span class="status-dot"></span>
          Đã liên kết với: <strong class="tg-username">@{{ telegramStatus.telegramUsername }}</strong>
        </div>
        <div v-else class="tg-status tg-status--unlinked">
          <span class="status-dot"></span>
          Chưa liên kết tài khoản Telegram
        </div>
        
        <div class="tg-actions">
          <n-button v-if="!telegramStatus.linked" type="primary" secondary block @click="openTelegramLink">
            <template #icon><n-icon><PaperPlaneOutline /></n-icon></template>
            Liên kết ngay
          </n-button>
          <n-button v-else type="error" secondary block @click="unlinkTelegram">
            Hủy liên kết tài khoản
          </n-button>
        </div>
      </div>
      <div v-else class="tg-loading">
        <n-spin size="small" />
      </div>
    </div>

    <!-- Logout section -->
    <div class="logout-section">
      <n-button type="error" ghost block size="large" class="logout-btn" @click="handleLogout">
        <template #icon><n-icon><LogOutOutline /></n-icon></template>
        Đăng xuất tài khoản
      </n-button>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.profile-card {
  padding: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  margin-bottom: 16px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.profile-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ef-primary) 0%, #8B5CF6 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.8rem;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.25);
  border: 2px solid #fff;
}

.avatar-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  background: var(--ef-success);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
  border: 2px solid #fff;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.profile-info-block {
  flex: 1;
  min-width: 0;
}

.name-display-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-name {
  font-weight: 700;
  font-size: 1.3rem;
  color: var(--ef-text);
  margin: 0;
  line-height: 1.2;
}

.edit-btn {
  background: none;
  border: none;
  color: var(--ef-text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: var(--ef-border-light);
  color: var(--ef-primary);
}

.name-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.name-input {
  flex: 1;
}

.edit-actions {
  display: flex;
  gap: 4px;
}

.profile-email {
  font-size: 0.85rem;
  color: var(--ef-text-secondary);
  margin-top: 4px;
  font-weight: 500;
}

/* Details Card */
.detail-card {
  padding: 24px;
  margin-bottom: 16px;
}

.card-section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ef-text);
  margin: 0 0 16px 0;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.info-item__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--ef-border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ef-text-secondary);
  font-size: 1.2rem;
}

.info-item__content {
  display: flex;
  flex-direction: column;
}

.info-item__label {
  font-size: 0.75rem;
  color: var(--ef-text-tertiary);
  font-weight: 500;
}

.info-item__value {
  font-size: 0.9rem;
  color: var(--ef-text);
  font-weight: 600;
  margin-top: 2px;
}

.provider-tag {
  display: inline-block;
  background: var(--ef-primary-light);
  color: var(--ef-primary);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

/* Telegram Card */
.telegram-card {
  padding: 24px;
  margin-bottom: 24px;
}

.telegram-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 16px;
}

.tg-icon-wrapper {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #0088cc1a;
  color: #0088cc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  flex-shrink: 0;
}

.tg-desc {
  font-size: 0.8rem;
  color: var(--ef-text-secondary);
  line-height: 1.4;
  margin: 0;
}

.tg-status-action {
  background: var(--ef-border-light);
  border-radius: var(--ef-radius);
  padding: 16px;
}

.tg-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 14px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tg-status--linked .status-dot {
  background: var(--ef-success);
  box-shadow: 0 0 8px var(--ef-success);
}

.tg-status--unlinked .status-dot {
  background: var(--ef-text-tertiary);
}

.tg-username {
  color: #0088cc;
}

.tg-loading {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

/* Logout Section */
.logout-section {
  margin-top: 16px;
}

.logout-btn {
  border-radius: var(--ef-radius-lg);
  font-weight: 600;
}

/* Avatar edit & overlay styles */
.profile-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
}

.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ef-primary) 0%, #8B5CF6 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.8rem;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.25);
  border: 2px solid #fff;
  position: relative;
  overflow: hidden;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: white;
  font-size: 1.2rem;
}

.profile-avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

/* For mobile touch screens, keep it slightly visible at the bottom */
@media (max-width: 768px) {
  .avatar-overlay {
    opacity: 1;
    background: rgba(0, 0, 0, 0.3);
    height: 24px;
    top: auto;
    font-size: 0.85rem;
  }
}
</style>
