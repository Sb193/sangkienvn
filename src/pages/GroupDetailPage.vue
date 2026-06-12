<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NTabs, NTabPane, NSpin, NEmpty, useMessage } from 'naive-ui'
import { 
  AddOutline, CardOutline, GiftOutline, TrendingUpOutline, EllipsisHorizontalCircleOutline,
  RestaurantOutline, CarOutline, HomeOutline, FlashOutline, 
  GameControllerOutline, CartOutline, MedkitOutline, BookOutline,
  PricetagOutline
} from '@vicons/ionicons5'
import { useGroupsStore } from '@/stores/groups'
import { useTransactionsStore } from '@/stores/transactions'
import { useAuthStore } from '@/stores/auth'
import { CameraOutline } from '@vicons/ionicons5'
import api, { uploadApi } from '@/services/api'
import type { GroupFund, FundTransaction } from '@/types'

import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { PieChart, LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([PieChart, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

const route = useRoute()
const router = useRouter()
const groupsStore = useGroupsStore()
const txStore = useTransactionsStore()
const message = useMessage()
const groupId = route.params.id as string
const loading = ref(true)
const auth = useAuthStore()
const fileInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)
const editedGroupName = ref('')
const editedGroupDesc = ref('')
const savingSettings = ref(false)

const isOwner = computed(() => {
  const me = groupsStore.members.find(m => m.user_id === auth.user?.id)
  return me?.role === 'owner'
})

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

  // Limit group avatar image size to 5MB
  if (file.size > 5 * 1024 * 1024) {
    message.error('Kích thước ảnh nhóm không vượt quá 5MB')
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

    // Update group avatar URL in Worker database
    await groupsStore.updateGroup(groupId, { avatarUrl: cloudinaryUrl })
    message.success('Đã cập nhật ảnh nhóm thành công qua Cloudinary! 🎉')
  } catch (err: any) {
    message.error(err.response?.data?.error?.message || 'Cập nhật ảnh nhóm thất bại')
  } finally {
    uploadingAvatar.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function saveSettings() {
  if (!editedGroupName.value.trim()) {
    message.warning('Tên nhóm không được để trống')
    return
  }
  savingSettings.value = true
  try {
    await groupsStore.updateGroup(groupId, {
      name: editedGroupName.value.trim(),
      description: editedGroupDesc.value.trim() || undefined
    })
    message.success('Đã lưu cài đặt nhóm thành công! 🎉')
  } catch (err: any) {
    message.error(err.response?.data?.error?.message || 'Cập nhật cài đặt nhóm thất bại')
  } finally {
    savingSettings.value = false
  }
}

const fund = ref<GroupFund | null>(null)
const fundHistory = ref<FundTransaction[]>([])

const generatingInvite = ref(false)

const reportSummary = ref<any>(null)
const reportByCategory = ref<any[]>([])
const reportByMember = ref<any[]>([])
const reportByDate = ref<any[]>([])

const groupTransactions = computed(() => {
  return txStore.transactions.filter(t => t.group_id === groupId)
})

onMounted(async () => {
  try {
    await groupsStore.fetchGroupDetail(groupId)
    if (groupsStore.currentGroup) {
      editedGroupName.value = groupsStore.currentGroup.name
      editedGroupDesc.value = groupsStore.currentGroup.description || ''
    }
    await Promise.all([
      fetchFund(),
      txStore.fetchTransactions({ groupId }),
      fetchReports()
    ])
  } finally {
    loading.value = false
  }
})

async function fetchFund() {
  try {
    const { data } = await api.get(`/groups/${groupId}/fund`)
    fund.value = data.data.fund
    fundHistory.value = data.data.history
  } catch {}
}
async function fetchReports() {
  try {
    const { data } = await api.get(`/reports/groups/${groupId}`)
    reportSummary.value = data.data.summary
    reportByCategory.value = data.data.byCategory
    reportByMember.value = data.data.byMember
    reportByDate.value = data.data.byDate
  } catch {}
}
function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount))
}

function copyJoinCode(code: string) {
  navigator.clipboard.writeText(code)
  message.success('Đã sao chép mã tham gia nhóm! 📋')
}

async function generateInviteLink() {
  generatingInvite.value = true
  try {
    const { data } = await api.post(`/groups/${groupId}/invite`)
    const inviteUrl = data.data.inviteUrl
    await navigator.clipboard.writeText(inviteUrl)
    message.success('Đã tạo và sao chép liên kết mời! 🔗')
  } catch (err: any) {
    message.error('Không thể tạo liên kết mời')
  } finally {
    generatingInvite.value = false
  }
}

function openTelegramBot() {
  window.open('https://t.me/my_expenseflow_bot', '_blank')
}

const pieOption = () => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  series: [{
    type: 'pie',
    radius: ['45%', '70%'],
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
    label: { show: true, fontSize: 12 },
    data: reportByCategory.value.map((c) => ({
      name: c.category_name || 'Quỹ & Khác',
      value: c.total_amount,
      itemStyle: { color: c.category_color || '#3B82F6' }
    })),
  }],
})

const lineOption = () => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 50, right: 20, top: 20, bottom: 30 },
  xAxis: { type: 'category' as const, data: reportByDate.value.map((d) => d.date.substring(5)) },
  yAxis: { type: 'value' as const },
  series: [{
    type: 'line',
    smooth: true,
    areaStyle: { color: 'rgba(59,130,246,0.15)' },
    lineStyle: { color: '#3B82F6', width: 2 },
    itemStyle: { color: '#3B82F6' },
    data: reportByDate.value.map((d) => d.total_amount),
  }],
})

const iconMap: Record<string, any> = {
  salary: CardOutline,
  allowance: GiftOutline,
  investment: TrendingUpOutline,
  food: RestaurantOutline,
  transport: CarOutline,
  rent: HomeOutline,
  utilities: FlashOutline,
  entertainment: GameControllerOutline,
  shopping: CartOutline,
  health: MedkitOutline,
  education: BookOutline,
  other: EllipsisHorizontalCircleOutline
}

const getIconComponent = (iconName: string | undefined | null) => {
  if (!iconName) return PricetagOutline
  return iconMap[iconName] || PricetagOutline
}
</script>

<template>
  <div>
    <div class="group-header-block">
      <div class="group-avatar-wrapper">
        <div class="group-avatar">
          <img v-if="groupsStore.currentGroup?.avatar_url" :src="groupsStore.currentGroup.avatar_url" alt="Group Avatar" class="group-avatar-img" />
          <span v-else>{{ groupsStore.currentGroup?.name?.charAt(0)?.toUpperCase() || 'G' }}</span>
        </div>
      </div>
      
      <div class="group-title-info">
        <h1 class="group-title-text">{{ groupsStore.currentGroup?.name || 'Nhóm' }}</h1>
        <p class="group-desc-text" v-if="groupsStore.currentGroup?.description">{{ groupsStore.currentGroup.description }}</p>
      </div>
    </div>
    
    <input 
      type="file" 
      ref="fileInput" 
      accept="image/*" 
      style="display: none" 
      @change="onFileSelected" 
    />

    <n-spin :show="loading">
      <n-tabs type="line" animated>
        <!-- Fund Tab -->
        <n-tab-pane name="fund" tab="Quỹ nhóm">
          <div v-if="fund" class="fund-summary ef-card">
            <div class="fund-summary__label">Số dư quỹ</div>
            <div class="fund-summary__balance">{{ formatMoney(fund.balance) }}₫</div>
          </div>
          <div v-if="fundHistory.length > 0" class="fund-history">
            <div v-for="ft in fundHistory" :key="ft.id" class="fund-tx ef-card">
              <span :class="ft.type === 'deposit' ? 'ef-badge--success' : 'ef-badge--danger'" class="ef-badge">{{ ft.type === 'deposit' ? 'Nạp' : 'Rút' }}</span>
              <span class="fund-tx__name">{{ ft.full_name }}</span>
              <span class="fund-tx__amount" :style="{ color: ft.type === 'deposit' ? 'var(--ef-success)' : 'var(--ef-danger)' }">{{ ft.type === 'deposit' ? '+' : '-' }}{{ formatMoney(ft.amount) }}₫</span>
            </div>
          </div>
        </n-tab-pane>

        <!-- Transactions Tab -->
        <n-tab-pane name="transactions" tab="Giao dịch">
          <div style="margin-bottom: 20px;">
            <button class="ef-btn ef-btn-primary ef-btn-block" @click="router.push(`/transactions/new?groupId=${groupId}`)">
              <n-icon size="20"><AddOutline /></n-icon>
              Ghi giao dịch quỹ mới
            </button>
          </div>

          <n-empty v-if="txStore.loading" description="Đang tải giao dịch nhóm..." />
          <n-empty v-else-if="groupTransactions.length === 0" description="Nhóm chưa có giao dịch nào" />
          <div v-else class="tx-list">
            <div v-for="t in groupTransactions" :key="t.id" class="tx-item ef-card">
              <div class="tx-item__icon-wrap" :style="{ backgroundColor: t.category_color ? t.category_color + '15' : 'var(--ef-primary-light)', color: t.category_color || 'var(--ef-primary)' }">
                <n-icon><component :is="getIconComponent(t.category_icon)" /></n-icon>
              </div>
              <div class="tx-item__info">
                <div class="tx-item__title">{{ t.title }}</div>
                <div class="tx-item__meta">
                  <span class="tx-item__payer">Trả bởi: {{ t.payer_name || 'Thành viên' }}</span>
                  <span class="tx-item__date" style="margin-left: 8px;">{{ t.transaction_date }}</span>
                </div>
              </div>
              <div class="tx-item__amount" :class="t.transaction_type">
                {{ formatMoney(t.amount) }}₫
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- Reports Tab -->
        <n-tab-pane name="reports" tab="Báo cáo">
          <div v-if="reportSummary" class="report-summary">
            <div class="report-stat">
              <span class="report-stat__label">Tổng chi tiêu nhóm</span>
              <span class="report-stat__value report-stat__value--expense">{{ formatMoney(reportSummary.totalAmount) }}₫</span>
            </div>
            <div class="report-stat" v-if="fund">
              <span class="report-stat__label">Số dư quỹ nhóm</span>
              <span class="report-stat__value report-stat__value--income">{{ formatMoney(fund.balance) }}₫</span>
            </div>
          </div>

          <div v-if="reportByCategory.length > 0" class="ef-card chart-card">
            <h3 class="chart-title">Phân bổ chi tiêu nhóm</h3>
            <v-chart :option="pieOption()" autoresize style="height: 280px" />
          </div>

          <div v-if="reportByDate.length > 0" class="ef-card chart-card">
            <h3 class="chart-title">Biến động chi tiêu theo ngày</h3>
            <v-chart :option="lineOption()" autoresize style="height: 240px" />
          </div>

          <!-- Telegram Bot Integration Banner -->
          <div class="telegram-banner ef-card">
            <div class="tg-banner-header">
              <div class="tg-icon">🤖</div>
              <div class="tg-title-desc">
                <div class="tg-title">ExpenseFlow Telegram Bot</div>
                <div class="tg-desc">Liên kết tài khoản Telegram để nhận thông báo tức thì và ghi chép nhanh giao dịch nhóm trực tiếp rảnh tay.</div>
              </div>
            </div>
            <button class="ef-btn ef-btn-primary ef-btn-block" @click="openTelegramBot">
              Trò chuyện với Bot Telegram
            </button>
          </div>
        </n-tab-pane>

        <!-- Members Tab -->
        <n-tab-pane name="members" tab="Cài đặt">
          <!-- Cài đặt nhóm (Chỉ owner) -->
          <div class="settings-card ef-card" v-if="isOwner">
            <div class="settings-card__header">
              <div class="settings-card__title">Cài đặt nhóm</div>
              <div class="settings-card__subtitle">Chỉnh sửa thông tin nhóm và ảnh đại diện nhóm.</div>
            </div>
            <div class="settings-card__body">
              <div class="edit-avatar-row">
                <div class="group-avatar-preview" @click="triggerAvatarSelection" title="Thay đổi ảnh nhóm">
                  <n-spin :show="uploadingAvatar" size="small" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <img v-if="groupsStore.currentGroup?.avatar_url" :src="groupsStore.currentGroup.avatar_url" alt="Group Avatar" class="group-avatar-img" />
                    <span v-else>{{ groupsStore.currentGroup?.name?.charAt(0)?.toUpperCase() || 'G' }}</span>
                    <div class="group-avatar-overlay-tab">
                      <n-icon><CameraOutline /></n-icon>
                    </div>
                  </n-spin>
                </div>
                <div class="avatar-help-text">
                  <strong>Ảnh đại diện nhóm</strong>
                  <p>Nhấp vào hình tròn để tải ảnh lên (tối đa 1MB).</p>
                </div>
              </div>

              <div class="settings-form">
                <div class="form-row">
                  <span class="form-label">Tên nhóm</span>
                  <n-input v-model:value="editedGroupName" placeholder="Nhập tên nhóm..." :disabled="savingSettings" />
                </div>
                <div class="form-row" style="margin-top: 12px;">
                  <span class="form-label">Mô tả nhóm</span>
                  <n-input v-model:value="editedGroupDesc" type="textarea" placeholder="Nhập mô tả ngắn..." :disabled="savingSettings" />
                </div>
                <button 
                  class="ef-btn ef-btn-primary ef-btn-sm" 
                  style="margin-top: 16px;"
                  :disabled="savingSettings"
                  @click="saveSettings"
                >
                  {{ savingSettings ? 'Đang lưu...' : 'Lưu thông tin' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Invite / Join Code card -->
          <div class="invite-card ef-card" v-if="groupsStore.currentGroup">
            <div class="invite-card__header">
              <div class="invite-card__title">Mã mời tham gia nhóm</div>
              <div class="invite-card__subtitle">Chia sẻ mã này hoặc liên kết để mời người khác vào nhóm chi tiêu chung.</div>
            </div>
            <div class="invite-card__actions">
              <div class="join-code-box">
                {{ groupsStore.currentGroup.join_code }}
              </div>
              <div class="invite-card__btn-group">
                <button class="ef-btn ef-btn-primary ef-btn-sm" @click="copyJoinCode(groupsStore.currentGroup.join_code)">
                  Sao chép mã
                </button>
                <button class="ef-btn ef-btn-secondary ef-btn-sm" @click="generateInviteLink" :disabled="generatingInvite">
                  {{ generatingInvite ? 'Đang tạo...' : 'Lấy liên kết mời' }}
                </button>
              </div>
            </div>
          </div>

          <div class="member-list">
            <div v-for="m in groupsStore.members" :key="m.user_id" class="member-item ef-card">
              <div class="member-item__avatar">{{ m.full_name?.charAt(0)?.toUpperCase() }}</div>
              <div class="member-item__info">
                <div class="member-item__name">{{ m.full_name }}</div>
                <div class="member-item__email">{{ m.email }}</div>
              </div>
              <span class="ef-badge ef-badge--primary">{{ m.role }}</span>
            </div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-spin>
  </div>
</template>

<style scoped>
.invite-card {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: linear-gradient(135deg, var(--ef-surface), #f8fafc);
}
.invite-card__title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--ef-text);
}
.invite-card__subtitle {
  font-size: 0.82rem;
  color: var(--ef-text-secondary);
  margin-top: 4px;
}
.invite-card__actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.join-code-box {
  background: var(--ef-primary-light);
  color: var(--ef-primary);
  border: 1px dashed var(--ef-primary);
  padding: 10px 20px;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  border-radius: 8px;
  text-align: center;
  min-width: 140px;
}
.invite-card__btn-group {
  display: flex;
  gap: 8px;
}
.member-list, .debt-list, .settlement-list, .log-list, .fund-history { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.member-item, .debt-item, .settlement-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.member-item__avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--ef-primary), #8B5CF6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }
.member-item__info { flex: 1; }
.member-item__name { font-weight: 600; font-size: 0.9rem; }
.member-item__email { font-size: 0.75rem; color: var(--ef-text-tertiary); }
.debt-item__from, .debt-item__to { font-weight: 600; }
.debt-item__arrow { color: var(--ef-text-tertiary); font-size: 0.8rem; }
.debt-item__amount { margin-left: auto; font-weight: 700; color: var(--ef-danger); }
.fund-summary { text-align: center; padding: 24px; margin-bottom: 12px; }
.fund-summary__label { font-size: 0.85rem; color: var(--ef-text-secondary); }
.fund-summary__balance { font-size: 2rem; font-weight: 800; color: var(--ef-primary); margin-top: 4px; }
.fund-tx { display: flex; align-items: center; gap: 10px; padding: 12px 16px; }
.fund-tx__name { flex: 1; font-weight: 500; font-size: 0.85rem; }
.fund-tx__amount { font-weight: 700; }
.log-item { padding: 12px 16px; }
.log-item__user { font-weight: 600; font-size: 0.85rem; }
.log-item__action { font-size: 0.8rem; color: var(--ef-text-secondary); margin-top: 2px; }
.log-item__date { font-size: 0.7rem; color: var(--ef-text-tertiary); margin-top: 4px; }
.tx-list { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.tx-item { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: var(--ef-radius-lg); transition: transform 0.2s; }
.tx-item__icon-wrap { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.tx-item__info { flex: 1; min-width: 0; }
.tx-item__title { font-weight: 600; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ef-text); }
.tx-item__meta { font-size: 0.75rem; color: var(--ef-text-tertiary); margin-top: 4px; font-weight: 500; }
.tx-item__amount { font-weight: 700; font-size: 1rem; white-space: nowrap; margin-left: auto; }
.tx-item__amount.income { color: var(--ef-success); }
.tx-item__amount.expense { color: var(--ef-danger); }

/* Telegram Bot Banner */
.telegram-banner {
  margin-top: 24px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  padding: 16px;
  border-radius: var(--ef-radius-lg);
}
.tg-banner-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.tg-icon {
  font-size: 2rem;
}
.tg-title {
  font-weight: 700;
  color: #0369a1;
}
.tg-desc {
  font-size: 0.8rem;
  color: #0c4a6e;
  margin-top: 4px;
}

/* Reports elements */
.report-summary { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.report-stat { flex: 1; min-width: 120px; background: var(--ef-surface); border: 1px solid var(--ef-border-light); border-radius: var(--ef-radius); padding: 16px; text-align: center; }
.report-stat__label { display: block; font-size: 0.8rem; color: var(--ef-text-tertiary); margin-bottom: 4px; }
.report-stat__value { font-size: 1.15rem; font-weight: 700; }
.report-stat__value--expense { color: var(--ef-danger); }
.report-stat__value--income { color: var(--ef-success); }
.chart-card { margin-bottom: 16px; }
.chart-title { font-size: 0.95rem; font-weight: 600; margin-bottom: 12px; }

/* Group Header and Editable Avatar styles */
.group-header-block {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.group-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.group-avatar-wrapper--editable {
  cursor: pointer;
}

.group-avatar {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--ef-primary), #8B5CF6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.6rem;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  border: 2px solid #fff;
  position: relative;
  overflow: hidden;
}

.group-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.group-avatar-overlay {
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
  font-size: 1.1rem;
}

.group-avatar-wrapper--editable:hover .group-avatar-overlay {
  opacity: 1;
}

@media (max-width: 768px) {
  .group-avatar-overlay {
    opacity: 1;
    background: rgba(0, 0, 0, 0.3);
    height: 20px;
    top: auto;
    font-size: 0.8rem;
  }
}

.group-title-info {
  flex: 1;
  min-width: 0;
}

.group-title-text {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--ef-text);
  margin: 0;
  line-height: 1.2;
}

.group-desc-text {
  font-size: 0.85rem;
  color: var(--ef-text-secondary);
  margin: 4px 0 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Group Settings specific styles */
.settings-card {
  margin-bottom: 20px;
  background: var(--ef-surface);
  border: 1px solid var(--ef-border-light);
  border-radius: var(--ef-radius-lg);
  padding: 20px;
}
.settings-card__header {
  margin-bottom: 16px;
}
.settings-card__title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--ef-text);
  margin: 0;
}
.settings-card__subtitle {
  font-size: 0.82rem;
  color: var(--ef-text-secondary);
  margin-top: 4px;
  margin-bottom: 0;
}
.settings-card__body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.edit-avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.group-avatar-preview {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--ef-primary), #8B5CF6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.6rem;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid var(--ef-border-light);
}
.group-avatar-overlay-tab {
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
  font-size: 1.1rem;
}
.group-avatar-preview:hover .group-avatar-overlay-tab {
  opacity: 1;
}
@media (max-width: 768px) {
  .group-avatar-overlay-tab {
    opacity: 1;
    background: rgba(0, 0, 0, 0.3);
    height: 20px;
    top: auto;
    font-size: 0.8rem;
  }
}
.avatar-help-text {
  flex: 1;
}
.avatar-help-text strong {
  display: block;
  font-size: 0.9rem;
  color: var(--ef-text);
}
.avatar-help-text p {
  margin: 4px 0 0 0;
  font-size: 0.78rem;
  color: var(--ef-text-secondary);
}
.settings-form {
  display: flex;
  flex-direction: column;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ef-text-secondary);
}
</style>
