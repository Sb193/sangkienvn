<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { 
  NTabs, NTabPane, NSpin, NEmpty, useMessage,
  NButton, NModal, NCard, NTag, NPopconfirm, 
  NDescriptions, NDescriptionsItem, NIcon,
  NInput, NDatePicker, NSelect, NRadioGroup, NRadioButton
} from 'naive-ui'
import { 
  AddOutline, CardOutline, GiftOutline, TrendingUpOutline, EllipsisHorizontalCircleOutline,
  RestaurantOutline, CarOutline, HomeOutline, FlashOutline, 
  GameControllerOutline, CartOutline, MedkitOutline, BookOutline,
  PricetagOutline, TrashOutline, CalendarOutline, LocationOutline,
  PeopleOutline, WalletOutline, DocumentTextOutline, CameraOutline,
  FunnelOutline, LogOutOutline, SearchOutline, PersonOutline
} from '@vicons/ionicons5'
import api, { uploadApi } from '@/services/api'
import type { GroupFund, FundTransaction } from '@/types'
import { useGroupsStore } from '@/stores/groups'
import { useTransactionsStore } from '@/stores/transactions'
import { useAuthStore } from '@/stores/auth'

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

const showDetailModal = ref(false)
const showDeleteConfirmModal = ref(false)
const selectedTxDetails = ref<any>(null)
const loadingDetails = ref(false)

const showGroupFilterModal = ref(false)
const groupSearchQuery = ref('')
const groupTransactionTypeFilter = ref<'all' | 'income' | 'expense'>('all')
const groupStartDate = ref<number | null>(null)
const groupEndDate = ref<number | null>(null)
const groupPayerFilter = ref<string>('all')

const PAGE_SIZE = 20
const activeTab = ref('fund')
const groupLoadingMore = ref(false)

const hasActiveGroupFilters = computed(() => {
  return !!(
    groupSearchQuery.value.trim() ||
    groupTransactionTypeFilter.value !== 'all' ||
    groupStartDate.value ||
    groupEndDate.value ||
    groupPayerFilter.value !== 'all'
  )
})

const payerOptions = computed(() => {
  const list = [{ label: 'Tất cả thành viên', value: 'all' }]
  for (const m of groupsStore.members) {
    list.push({ label: m.full_name, value: m.user_id })
  }
  return list
})

function buildGroupFilters(limit = PAGE_SIZE, offset = 0) {
  const filters: Record<string, any> = { groupId, limit, offset }
  if (groupSearchQuery.value.trim()) {
    filters.search = groupSearchQuery.value.trim()
  }
  if (groupTransactionTypeFilter.value !== 'all') {
    filters.transactionType = groupTransactionTypeFilter.value
  }
  if (groupStartDate.value) {
    filters.startDate = new Date(groupStartDate.value).toISOString().substring(0, 10)
  }
  if (groupEndDate.value) {
    filters.endDate = new Date(groupEndDate.value).toISOString().substring(0, 10)
  }
  if (groupPayerFilter.value !== 'all') {
    filters.payerUserId = groupPayerFilter.value
  }
  return filters
}

async function applyGroupFilters() {
  await txStore.fetchTransactions(buildGroupFilters(PAGE_SIZE, 0), false)
  showGroupFilterModal.value = false
}

async function clearGroupFilters() {
  groupSearchQuery.value = ''
  groupTransactionTypeFilter.value = 'all'
  groupStartDate.value = null
  groupEndDate.value = null
  groupPayerFilter.value = 'all'
  await txStore.fetchTransactions({ groupId, limit: PAGE_SIZE, offset: 0 }, false)
  showGroupFilterModal.value = false
}

async function loadMoreGroupTransactions() {
  if (groupLoadingMore.value || !txStore.hasMore) return
  groupLoadingMore.value = true
  try {
    const filters = buildGroupFilters(PAGE_SIZE, txStore.transactions.length)
    await txStore.fetchTransactions(filters, true)
  } finally {
    groupLoadingMore.value = false
  }
}

useEventListener(window, 'scroll', () => {
  if (activeTab.value !== 'transactions') return
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const docHeight = document.documentElement.scrollHeight
  
  if (scrollTop + windowHeight >= docHeight - 150) {
    loadMoreGroupTransactions()
  }
})

async function openDetails(txId: string) {
  selectedTxDetails.value = null
  showDetailModal.value = true
  loadingDetails.value = true
  try {
    const { data } = await api.get(`/transactions/${txId}`)
    selectedTxDetails.value = data.data
  } catch (err: any) {
    message.error('Không thể lấy chi tiết giao dịch')
    showDetailModal.value = false
  } finally {
    loadingDetails.value = false
  }
}

async function handleDelete(txId: string) {
  try {
    await txStore.deleteTransaction(txId)
    message.success('Đã xóa giao dịch thành công')
    showDeleteConfirmModal.value = false
    showDetailModal.value = false
    // refresh list
    await Promise.all([
      fetchFund(),
      txStore.fetchTransactions({ groupId }),
      fetchReports()
    ])
  } catch (err: any) {
    message.error('Xóa giao dịch thất bại')
  }
}

const isDeletingGroup = ref(false)
const isLeavingGroup = ref(false)

async function handleLeaveGroup() {
  isLeavingGroup.value = true
  try {
    await groupsStore.leaveGroup(groupId)
    message.success('Đã rời nhóm thành công')
    router.replace('/groups')
  } catch (err: any) {
    message.error(err.response?.data?.error?.message || 'Rời nhóm thất bại')
  } finally {
    isLeavingGroup.value = false
  }
}

async function handleDeleteGroup() {
  isDeletingGroup.value = true
  try {
    await groupsStore.deleteGroup(groupId)
    message.success('Đã xóa nhóm thành công')
    router.replace('/groups')
  } catch (err: any) {
    message.error(err.response?.data?.error?.message || 'Xóa nhóm thất bại')
  } finally {
    isDeletingGroup.value = false
  }
}

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
const fundDebts = ref<any[]>([])
const canWithdrawFund = ref(false)

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
      txStore.fetchTransactions({ groupId, limit: PAGE_SIZE, offset: 0 }, false),
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
    canWithdrawFund.value = data.data.canWithdraw

    const debtsRes = await api.get(`/groups/${groupId}/fund/debts`)
    fundDebts.value = debtsRes.data.data
  } catch {}
}

async function handleRepayDebt(debt: any) {
  const remaining = debt.amount - debt.repaid_amount
  if (fund.value && fund.value.balance < remaining) {
    message.error(`Quỹ không đủ số dư để hoàn trả! (Cần ${formatMoney(remaining)}₫, Quỹ có ${formatMoney(fund.value.balance)}₫)`)
    return
  }

  try {
    await api.post('/transactions', {
      groupId: groupId,
      amount: remaining,
      title: `Hoàn trả tạm ứng`,
      note: `Hoàn trả khoản tạm ứng cho ${debt.full_name}`,
      transactionType: 'expense',
      transactionDate: new Date().toISOString().substring(0, 10),
      isRepayment: true,
      fundDebtId: debt.id
    })
    message.success('Đã hoàn trả khoản tạm ứng thành công! 🎉')
    await Promise.all([
      fetchFund(),
      txStore.fetchTransactions({ groupId }),
      fetchReports()
    ])
  } catch (err: any) {
    message.error(err.response?.data?.error?.message || 'Hoàn trả tạm ứng thất bại')
  }
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
      <n-tabs v-model:value="activeTab" type="line" animated>
        <!-- Fund Tab -->
        <n-tab-pane name="fund" tab="Quỹ nhóm">
          <div v-if="fund" class="fund-summary ef-card">
            <div class="fund-summary__label">Số dư quỹ</div>
            <div class="fund-summary__balance">{{ formatMoney(fund.balance) }}₫</div>
          </div>

          <!-- Member Advances (Ghi nợ/Tạm ứng) Section -->
          <div class="fund-advances-section" style="margin-top: 16px;">
            <div class="section-title-wrap" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--ef-text-secondary);">Thành viên tạm ứng chi</h4>
            </div>
            
            <div v-if="fundDebts.length === 0" class="ef-card" style="padding: 16px; text-align: center; color: var(--ef-text-secondary); font-size: 0.85rem;">
              Không có khoản tạm ứng nào
            </div>
            <div v-else class="fund-history">
              <div v-for="debt in fundDebts" :key="debt.id" class="fund-tx ef-card" style="flex-direction: column; align-items: stretch; gap: 8px; padding: 12px 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="payer-avatar" style="width: 24px; height: 24px; font-size: 0.75rem; border-radius: 50%; background-color: var(--ef-primary-light); color: var(--ef-primary); display: flex; align-items: center; justify-content: center; font-weight: 700;">
                      {{ debt.full_name?.charAt(0)?.toUpperCase() }}
                    </div>
                    <div>
                      <div style="font-weight: 600; font-size: 0.85rem; color: var(--ef-text);">{{ debt.full_name }}</div>
                      <div style="font-size: 0.75rem; color: var(--ef-text-secondary);">{{ debt.transaction_title || 'Tạm ứng chi' }}</div>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-weight: 700; font-size: 0.85rem; color: var(--ef-danger);">{{ formatMoney(debt.amount) }}₫</div>
                    <div style="font-size: 0.7rem; color: var(--ef-text-secondary);" v-if="debt.repaid_amount > 0">Đã hoàn trả: {{ formatMoney(debt.repaid_amount) }}₫</div>
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--ef-border-light); padding-top: 8px; margin-top: 4px;">
                  <span :class="debt.status === 'paid' ? 'ef-badge--success' : 'ef-badge--warning'" class="ef-badge" style="font-size: 0.7rem; padding: 2px 8px;">
                    {{ debt.status === 'paid' ? 'Đã trả xong' : 'Chờ hoàn trả' }}
                  </span>
                  
                  <button 
                    v-if="debt.status === 'pending' && canWithdrawFund" 
                    class="ef-btn ef-btn-sm ef-btn-success" 
                    style="padding: 4px 10px; font-size: 0.75rem; border-radius: 6px;"
                    @click="handleRepayDebt(debt)"
                  >
                    Hoàn trả từ quỹ
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Fund Transaction History Section -->
          <div class="fund-ledger-section" style="margin-top: 24px;">
            <h4 style="margin: 0 0 12px 0; font-size: 0.95rem; font-weight: 700; color: var(--ef-text-secondary);">Lịch sử nạp rút quỹ</h4>
            <div v-if="fundHistory.length === 0" class="ef-card" style="padding: 16px; text-align: center; color: var(--ef-text-secondary); font-size: 0.85rem;">
              Chưa có lịch sử giao dịch quỹ
            </div>
            <div v-else class="fund-history">
              <div v-for="ft in fundHistory" :key="ft.id" class="fund-tx ef-card">
                <span :class="ft.type === 'deposit' ? 'ef-badge--success' : 'ef-badge--danger'" class="ef-badge">{{ ft.type === 'deposit' ? 'Nạp' : 'Rút' }}</span>
                <span class="fund-tx__name">{{ ft.full_name }}</span>
                <span class="fund-tx__amount" :style="{ color: ft.type === 'deposit' ? 'var(--ef-success)' : 'var(--ef-danger)' }">
                  {{ ft.type === 'deposit' ? '+' : '-' }}{{ formatMoney(ft.amount) }}₫
                </span>
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- Transactions Tab -->
        <n-tab-pane name="transactions" tab="Giao dịch">
          <div style="margin-bottom: 20px; display: flex; gap: 8px;">
            <button class="ef-btn ef-btn-secondary ef-btn-block" style="display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1;" @click="showGroupFilterModal = true">
              <n-icon size="18"><FunnelOutline /></n-icon>
              Bộ Lọc
              <n-tag v-if="hasActiveGroupFilters" size="tiny" type="warning" round :bordered="false" style="margin-left: 2px;">
                Đang lọc
              </n-tag>
            </button>
            <button class="ef-btn ef-btn-primary ef-btn-block" style="display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1.2;" @click="router.push(`/transactions/new?groupId=${groupId}`)">
              <n-icon size="18"><AddOutline /></n-icon>
              Giao dịch quỹ
            </button>
          </div>

          <!-- Group Filter Modal -->
          <n-modal v-model:show="showGroupFilterModal">
            <n-card
              style="width: 95%; max-width: 420px; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid var(--ef-border-light);"
              title="Bộ lọc giao dịch nhóm"
              :bordered="false"
              size="medium"
              role="dialog"
              aria-modal="true"
            >
              <template #header-extra>
                <n-icon size="20" style="color: var(--ef-primary);"><PeopleOutline /></n-icon>
              </template>

              <div style="display: flex; flex-direction: column; gap: 20px; padding: 4px 0;">
                <!-- Search -->
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <n-icon size="18" style="color: var(--ef-primary); display: flex; align-items: center;"><SearchOutline /></n-icon>
                    <label style="font-weight: 700; color: var(--ef-text); font-size: 0.95rem;">
                      Tìm kiếm tiêu đề hoặc ghi chú
                    </label>
                  </div>
                  <n-input v-model:value="groupSearchQuery" placeholder="Nhập từ khóa cần tìm..." clearable size="large" style="border-radius: 10px;" />
                </div>

                <!-- Transaction Type -->
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <n-icon size="18" style="color: var(--ef-primary); display: flex; align-items: center;"><PricetagOutline /></n-icon>
                    <label style="font-weight: 700; color: var(--ef-text); font-size: 0.95rem;">
                      Phân loại giao dịch
                    </label>
                  </div>
                  <n-radio-group v-model:value="groupTransactionTypeFilter" size="large" style="width: 100%;">
                    <n-radio-button value="all" style="width: 33.33%; text-align: center; border-radius: 10px 0 0 10px;">Tất cả</n-radio-button>
                    <n-radio-button value="income" style="width: 33.33%; text-align: center;">Thu nhập</n-radio-button>
                    <n-radio-button value="expense" style="width: 33.34%; text-align: center; border-radius: 0 10px 10px 0;">Chi tiêu</n-radio-button>
                  </n-radio-group>
                </div>

                <!-- Payer Filter -->
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <n-icon size="18" style="color: var(--ef-primary); display: flex; align-items: center;"><PersonOutline /></n-icon>
                    <label style="font-weight: 700; color: var(--ef-text); font-size: 0.95rem;">
                      Người thanh toán
                    </label>
                  </div>
                  <n-select
                    v-model:value="groupPayerFilter"
                    :options="payerOptions"
                    size="large"
                    style="border-radius: 10px;"
                  />
                </div>

                <!-- Date filters -->
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <n-icon size="18" style="color: var(--ef-primary); display: flex; align-items: center;"><CalendarOutline /></n-icon>
                    <label style="font-weight: 700; color: var(--ef-text); font-size: 0.95rem;">
                      Khoảng thời gian
                    </label>
                  </div>
                  <div style="display: flex; gap: 10px; align-items: center;">
                    <n-date-picker v-model:value="groupStartDate" type="date" placeholder="Từ ngày" clearable size="large" style="flex: 1; border-radius: 10px;" />
                    <span style="color: var(--ef-text-tertiary); font-weight: 600;">→</span>
                    <n-date-picker v-model:value="groupEndDate" type="date" placeholder="Đến ngày" clearable size="large" style="flex: 1; border-radius: 10px;" />
                  </div>
                </div>
              </div>

              <template #action>
                <div style="display: flex; justify-content: space-between; gap: 12px; padding-top: 8px;">
                  <button class="ef-btn ef-btn-secondary" style="flex: 1; padding: 12px; border-radius: 12px; font-weight: 600;" @click="clearGroupFilters">
                    Đặt lại
                  </button>
                  <button class="ef-btn ef-btn-primary" style="flex: 1.5; padding: 12px; border-radius: 12px; font-weight: 600;" @click="applyGroupFilters">
                    Áp dụng bộ lọc
                  </button>
                </div>
              </template>
            </n-card>
          </n-modal>

          <n-empty v-if="txStore.loading && groupTransactions.length === 0" description="Đang tải giao dịch nhóm..." />
          <n-empty v-else-if="groupTransactions.length === 0" description="Nhóm chưa có giao dịch nào" />
          <div v-else class="tx-list">
            <div 
              v-for="t in groupTransactions" 
              :key="t.id" 
              class="tx-item ef-card"
              @click="openDetails(t.id)"
            >
              <div class="tx-item__icon-wrap" :style="{ backgroundColor: t.category_color ? t.category_color + '15' : 'var(--ef-primary-light)', color: t.category_color || 'var(--ef-primary)' }">
                <n-icon><component :is="getIconComponent(t.category_icon)" /></n-icon>
              </div>
              <div class="tx-item__info">
                <div class="tx-item__title" style="display: flex; align-items: center; gap: 8px;">
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ t.title }}</span>
                  <n-tag v-if="t.is_fund_debt" size="small" type="warning" :bordered="false" style="flex-shrink: 0;">
                    Tạm ứng
                  </n-tag>
                  <n-tag v-slot v-if="t.title?.startsWith('Hoàn trả tạm ứng')" size="small" type="success" :bordered="false" style="flex-shrink: 0;">
                    Hoàn trả
                  </n-tag>
                </div>
                <div class="tx-item__meta">
                  <span class="tx-item__payer">Trả bởi: {{ t.payer_name || 'Thành viên' }}</span>
                  <span class="tx-item__date" style="margin-left: 8px;">{{ t.transaction_date }}</span>
                </div>
              </div>
              <div class="tx-item__amount" :class="t.transaction_type">
                {{ t.transaction_type === 'income' ? '+' : '-' }}{{ formatMoney(t.amount) }}₫
              </div>
            </div>

            <!-- Loading more indicator -->
            <div v-if="groupLoadingMore" style="display: flex; justify-content: center; align-items: center; padding: 20px 0;">
              <n-spin size="small" />
              <span style="margin-left: 8px; color: var(--ef-text-secondary); font-size: 0.9rem;">Đang tải thêm giao dịch...</span>
            </div>
            <div v-else-if="!txStore.hasMore && groupTransactions.length > 0" style="text-align: center; padding: 20px 0; color: var(--ef-text-tertiary); font-size: 0.85rem;">
              Đã hiển thị tất cả giao dịch nhóm gần đây
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

          <!-- Danger Zone -->
          <div class="danger-zone ef-card" style="margin-top: 24px; border: 1.5px solid var(--ef-danger); background: rgba(239,68,68,0.04);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 1.1rem;">⚠️</span>
              <span style="font-weight: 700; color: var(--ef-danger); font-size: 0.95rem;">Khu vực nguy hiểm</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--ef-text-secondary); margin: 0 0 16px 0; line-height: 1.5;">
              <span v-if="isOwner">Xóa nhóm sẽ xóa vĩnh viễn tất cả dữ liệu giao dịch, quỹ và lịch sử hoạt động. Hành động này không thể hoàn tác.</span>
              <span v-else>Sau khi rời nhóm, bạn sẽ không còn quyền truy cập vào dữ liệu nhóm. Bạn cần mã mời để tham gia lại.</span>
            </p>

            <!-- Owner: Delete Group -->
            <n-popconfirm
              v-if="isOwner"
              @positive-click="handleDeleteGroup"
              positive-text="Xóa nhóm"
              negative-text="Hủy"
              :positive-button-props="{ type: 'error' }"
            >
              <template #trigger>
                <button
                  class="ef-btn ef-btn-sm"
                  style="background: var(--ef-danger); color: #fff; border: none; width: 100%; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;"
                  :disabled="isDeletingGroup"
                >
                  <n-icon><TrashOutline /></n-icon>
                  {{ isDeletingGroup ? 'Đang xóa nhóm...' : 'Xóa nhóm' }}
                </button>
              </template>
              Bạn có chắc muốn xóa nhóm "{{ groupsStore.currentGroup?.name }}"? Tất cả dữ liệu sẽ bị xóa vĩnh viễn.
            </n-popconfirm>

            <!-- Non-owner: Leave Group -->
            <n-popconfirm
              v-else
              @positive-click="handleLeaveGroup"
              positive-text="Rời nhóm"
              negative-text="Hủy"
            >
              <template #trigger>
                <button
                  class="ef-btn ef-btn-sm"
                  style="background: transparent; color: var(--ef-danger); border: 1.5px solid var(--ef-danger); width: 100%; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;"
                  :disabled="isLeavingGroup"
                >
                  <n-icon><LogOutOutline /></n-icon>
                  {{ isLeavingGroup ? 'Đang rời nhóm...' : 'Rời khỏi nhóm' }}
                </button>
              </template>
              Bạn có chắc muốn rời khỏi nhóm "{{ groupsStore.currentGroup?.name }}"?
            </n-popconfirm>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-spin>

    <!-- Detailed Transaction Modal -->
    <n-modal v-model:show="showDetailModal">
      <n-card
        style="width: 500px; max-width: 95vw; border-radius: 16px; box-shadow: var(--ef-shadow-lg);"
        title="Chi tiết giao dịch"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <template #header-extra>
          <n-tag 
            v-if="selectedTxDetails" 
            :bordered="false" 
            :style="{ background: (selectedTxDetails.category_color || '#3B82F6') + '20', color: selectedTxDetails.category_color || '#3B82F6' }"
          >
            {{ selectedTxDetails.category_name || 'Chưa phân loại' }}
          </n-tag>
        </template>

        <n-spin :show="loadingDetails">
          <div v-if="selectedTxDetails" class="tx-details">
            <!-- Large Amount Display -->
            <div class="details-amount-block" :class="selectedTxDetails.transaction_type === 'income' ? 'income-color' : 'expense-color'">
              <span class="amount-sign">{{ selectedTxDetails.transaction_type === 'income' ? '+' : '-' }}</span>
              <span class="amount-val">{{ formatMoney(selectedTxDetails.amount) }}</span>
              <span class="amount-currency">₫</span>
            </div>

            <!-- Title -->
            <h3 class="details-title" style="display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
              <span>{{ selectedTxDetails.title || 'Không có tiêu đề' }}</span>
              <n-tag v-if="selectedTxDetails.is_fund_debt" size="small" type="warning" :bordered="false">
                Tạm ứng
              </n-tag>
              <n-tag v-slot v-if="selectedTxDetails.title?.startsWith('Hoàn trả tạm ứng')" size="small" type="success" :bordered="false">
                Hoàn trả
              </n-tag>
            </h3>

            <n-descriptions label-placement="left" :column="1" class="details-list" bordered>
              <n-descriptions-item>
                <template #label>
                  <div class="desc-label"><n-icon><CalendarOutline /></n-icon> Ngày tạo</div>
                </template>
                {{ selectedTxDetails.transaction_date }}
              </n-descriptions-item>

              <n-descriptions-item>
                <template #label>
                  <div class="desc-label"><n-icon><WalletOutline /></n-icon> Người chi</div>
                </template>
                {{ selectedTxDetails.payer_name || 'Hệ thống' }}
              </n-descriptions-item>

              <n-descriptions-item>
                <template #label>
                  <div class="desc-label"><n-icon><EllipsisHorizontalCircleOutline /></n-icon> Loại ví</div>
                </template>
                {{ selectedTxDetails.group_id ? `Nhóm: ${selectedTxDetails.group_name || ''}` : 'Ví cá nhân' }}
              </n-descriptions-item>

              <n-descriptions-item v-if="selectedTxDetails.address">
                <template #label>
                  <div class="desc-label"><n-icon><LocationOutline /></n-icon> Địa điểm</div>
                </template>
                {{ selectedTxDetails.address }}
              </n-descriptions-item>

              <n-descriptions-item v-if="selectedTxDetails.note">
                <template #label>
                  <div class="desc-label"><n-icon><DocumentTextOutline /></n-icon> Ghi chú</div>
                </template>
                {{ selectedTxDetails.note }}
              </n-descriptions-item>
            </n-descriptions>

            <!-- Group Split Info if applicable -->
            <div v-if="selectedTxDetails.group_id && selectedTxDetails.participants?.length > 0" class="split-info-block">
              <h4 class="section-title">
                <n-icon><PeopleOutline /></n-icon> Chia sẻ thành viên ({{ selectedTxDetails.split_type || 'Bằng nhau' }})
              </h4>
              <div class="participants-list">
                <div v-for="part in selectedTxDetails.participants" :key="part.id" class="participant-item">
                  <span class="part-name">{{ part.full_name }}</span>
                  <span class="part-amount">{{ formatMoney(part.calculated_amount) }} ₫</span>
                </div>
              </div>
            </div>

            <!-- Receipt Image Attachment -->
            <div v-if="selectedTxDetails.attachment_url" class="attachment-block">
              <h4 class="section-title">Ảnh hóa đơn</h4>
              <div class="receipt-preview">
                <img :src="selectedTxDetails.attachment_url" alt="Receipt Proof" class="receipt-img" />
              </div>
            </div>
          </div>
          <div v-else-if="!loadingDetails" class="empty-details">
            Không tìm thấy thông tin chi tiết.
          </div>
        </n-spin>

        <template #footer>
          <div class="modal-footer-actions">
            <n-button 
              v-if="selectedTxDetails" 
              type="error" 
              ghost
              @click="showDeleteConfirmModal = true"
            >
              <template #icon>
                <n-icon><TrashOutline /></n-icon>
              </template>
              Xóa giao dịch
            </n-button>
            <n-button secondary @click="showDetailModal = false">Đóng</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>

    <!-- Custom Delete Confirmation Modal (Mobile-friendly Dialog Card) -->
    <n-modal v-model:show="showDeleteConfirmModal">
      <n-card
        style="width: 340px; max-width: 90vw; border-radius: 20px; text-align: center; border: 1px solid var(--ef-border-light); box-shadow: var(--ef-shadow-lg);"
        :bordered="false"
        size="medium"
        role="dialog"
        aria-modal="true"
      >
        <div style="font-size: 3.5rem; margin-bottom: 8px; line-height: 1;">⚠️</div>
        <h3 style="margin: 0 0 8px 0; font-size: 1.2rem; font-weight: 700; color: var(--ef-text);">Xóa giao dịch?</h3>
        <p style="margin: 0 0 24px 0; font-size: 0.88rem; color: var(--ef-text-secondary); line-height: 1.5; padding: 0 8px;">
          Bạn có chắc chắn muốn xóa giao dịch này không? Hành động này không thể hoàn tác.
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button 
            class="ef-btn" 
            style="background: var(--ef-danger); color: white; border: none; width: 100%; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: background 0.2s;"
            @click="handleDelete(selectedTxDetails.id)"
          >
            Xóa vĩnh viễn
          </button>
          <button 
            class="ef-btn ef-btn-secondary" 
            style="width: 100%; padding: 14px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; cursor: pointer;"
            @click="showDeleteConfirmModal = false"
          >
            Hủy bỏ
          </button>
        </div>
      </n-card>
    </n-modal>
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
.tx-item { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: var(--ef-radius-lg); transition: transform 0.2s; cursor: pointer; }
.tx-item:active { transform: scale(0.98); }
.tx-item__icon-wrap { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.tx-item__info { flex: 1; min-width: 0; }
.tx-item__title { font-weight: 600; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ef-text); }
.tx-item__meta { font-size: 0.75rem; color: var(--ef-text-tertiary); margin-top: 4px; font-weight: 500; }
.tx-item__amount { font-weight: 700; font-size: 1rem; white-space: nowrap; margin-left: auto; }
.tx-item__amount.income { color: var(--ef-success); }
.tx-item__amount.expense { color: var(--ef-danger); }

/* Detail modal styles */
.tx-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.details-amount-block {
  text-align: center;
  padding: 16px 0;
  font-size: 2.2rem;
  font-weight: 800;
  display: flex;
  justify-content: center;
  align-items: baseline;
}
.amount-sign {
  font-size: 1.8rem;
  margin-right: 2px;
}
.amount-currency {
  font-size: 1.2rem;
  margin-left: 4px;
  font-weight: 600;
}
.income-color {
  color: var(--ef-success);
}
.expense-color {
  color: var(--ef-danger);
}
.details-title {
  text-align: center;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ef-text);
  margin-top: -8px;
  margin-bottom: 16px;
}
.desc-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--ef-text-secondary);
}
.desc-label .n-icon {
  font-size: 1.1rem;
}
.split-info-block, .attachment-block {
  margin-top: 16px;
  border-top: 1px dashed var(--ef-border-light);
  padding-top: 16px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--ef-text-secondary);
}
.section-title .n-icon {
  font-size: 1.1rem;
}
.participants-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--ef-bg-light);
  padding: 12px;
  border-radius: 8px;
}
.participant-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  font-weight: 500;
}
.part-name {
  color: var(--ef-text);
}
.part-amount {
  font-weight: 600;
  color: var(--ef-text-secondary);
}
.receipt-preview {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--ef-border-light);
  max-height: 250px;
  display: flex;
  justify-content: center;
}
.receipt-img {
  width: 100%;
  height: auto;
  object-fit: contain;
}
.modal-footer-actions {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
.empty-details {
  text-align: center;
  color: var(--ef-text-tertiary);
  padding: 24px 0;
}

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
