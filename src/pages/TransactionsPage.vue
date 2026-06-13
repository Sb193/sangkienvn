<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { 
  NButton, NSpin, NEmpty, NIcon, NModal, NCard, NTag, 
  NPopconfirm, useMessage, NDescriptions, NDescriptionsItem,
  NInput, NDatePicker, NSelect, NRadioGroup, NRadioButton
} from 'naive-ui'
import { useTransactionsStore } from '@/stores/transactions'
import api from '@/services/api'
import { 
  CardOutline, GiftOutline, TrendingUpOutline, EllipsisHorizontalCircleOutline,
  RestaurantOutline, CarOutline, HomeOutline, FlashOutline, 
  GameControllerOutline, CartOutline, MedkitOutline, BookOutline,
  PricetagOutline, TrashOutline, CalendarOutline, LocationOutline,
  PeopleOutline, WalletOutline, DocumentTextOutline, AddOutline,
  FunnelOutline
} from '@vicons/ionicons5'
import { computed } from 'vue'

const router = useRouter()
const message = useMessage()
const txStore = useTransactionsStore()

const showDetailModal = ref(false)
const showDeleteConfirmModal = ref(false)
const selectedTxDetails = ref<any>(null)
const loadingDetails = ref(false)

const showFilterModal = ref(false)
const searchQuery = ref('')
const transactionTypeFilter = ref<'all' | 'income' | 'expense'>('all')
const startDate = ref<number | null>(null)
const endDate = ref<number | null>(null)

const PAGE_SIZE = 20
const loadingMore = ref(false)

const hasActiveFilters = computed(() => {
  return !!(searchQuery.value.trim() || transactionTypeFilter.value !== 'all' || startDate.value || endDate.value)
})

function buildFilters(limit = PAGE_SIZE, offset = 0) {
  const filters: Record<string, any> = { limit, offset }
  if (searchQuery.value.trim()) {
    filters.search = searchQuery.value.trim()
  }
  if (transactionTypeFilter.value !== 'all') {
    filters.transactionType = transactionTypeFilter.value
  }
  if (startDate.value) {
    filters.startDate = new Date(startDate.value).toISOString().substring(0, 10)
  }
  if (endDate.value) {
    filters.endDate = new Date(endDate.value).toISOString().substring(0, 10)
  }
  return filters
}

async function applyFilters() {
  await txStore.fetchTransactions(buildFilters(PAGE_SIZE, 0), false)
  showFilterModal.value = false
}

async function clearFilters() {
  searchQuery.value = ''
  transactionTypeFilter.value = 'all'
  startDate.value = null
  endDate.value = null
  await txStore.fetchTransactions({ limit: PAGE_SIZE, offset: 0 }, false)
  showFilterModal.value = false
}

async function loadMoreTransactions() {
  if (loadingMore.value || !txStore.hasMore) return
  loadingMore.value = true
  try {
    const filters = buildFilters(PAGE_SIZE, txStore.transactions.length)
    await txStore.fetchTransactions(filters, true)
  } finally {
    loadingMore.value = false
  }
}

useEventListener(window, 'scroll', () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const docHeight = document.documentElement.scrollHeight
  
  if (scrollTop + windowHeight >= docHeight - 150) {
    loadMoreTransactions()
  }
})

onMounted(() => {
  txStore.fetchTransactions({ limit: PAGE_SIZE, offset: 0 }, false)
})

function formatMoney(amount: any) {
  const num = Number(amount)
  if (isNaN(num)) return '0'
  return new Intl.NumberFormat('vi-VN').format(Math.round(num))
}

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
  } catch (err: any) {
    message.error('Xóa giao dịch thất bại')
  }
}

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
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1 class="ef-page-title" style="margin: 0;">Giao dịch</h1>
      <div style="display: flex; gap: 8px;">
        <button class="ef-btn ef-btn-secondary ef-btn-sm" style="display: flex; align-items: center; gap: 4px; padding: 6px 12px;" @click="showFilterModal = true">
          <n-icon size="16"><FunnelOutline /></n-icon>
          Bộ Lọc
          <n-tag v-if="hasActiveFilters" size="tiny" type="warning" round :bordered="false" style="margin-left: 2px;">
            Đang lọc
          </n-tag>
        </button>
        <button class="ef-btn ef-btn-primary ef-btn-sm" style="display: flex; align-items: center; gap: 4px; padding: 6px 12px;" @click="router.push('/transactions/new')">
          <n-icon size="16"><AddOutline /></n-icon>
          Giao dịch
        </button>
      </div>
    </div>

    <!-- Filter Modal -->
    <n-modal v-model:show="showFilterModal">
      <n-card
        style="width: 95%; max-width: 420px; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid var(--ef-border-light);"
        title="Bộ lọc giao dịch"
        :bordered="false"
        size="medium"
        role="dialog"
        aria-modal="true"
      >
        <template #header-extra>
          <span style="font-size: 1.2rem;">⚡</span>
        </template>
        
        <div style="display: flex; flex-direction: column; gap: 20px; padding: 4px 0;">
          <!-- Search input -->
          <div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
              <span style="font-size: 1.1rem; color: var(--ef-primary);">🔍</span>
              <label style="font-weight: 700; color: var(--ef-text); font-size: 0.95rem;">
                Tìm kiếm tiêu đề hoặc ghi chú
              </label>
            </div>
            <n-input v-model:value="searchQuery" placeholder="Nhập từ khóa cần tìm..." clearable size="large" style="border-radius: 10px;" />
          </div>

          <!-- Transaction Type filter -->
          <div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
              <span style="font-size: 1.1rem; color: var(--ef-primary);">🏷️</span>
              <label style="font-weight: 700; color: var(--ef-text); font-size: 0.95rem;">
                Phân loại giao dịch
              </label>
            </div>
            <n-radio-group v-model:value="transactionTypeFilter" size="large" style="width: 100%;">
              <n-radio-button value="all" style="width: 33.33%; text-align: center; border-radius: 10px 0 0 10px;">Tất cả</n-radio-button>
              <n-radio-button value="income" style="width: 33.33%; text-align: center;">Thu nhập</n-radio-button>
              <n-radio-button value="expense" style="width: 33.34%; text-align: center; border-radius: 0 10px 10px 0;">Chi tiêu</n-radio-button>
            </n-radio-group>
          </div>

          <!-- Date filters -->
          <div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
              <span style="font-size: 1.1rem; color: var(--ef-primary);">📅</span>
              <label style="font-weight: 700; color: var(--ef-text); font-size: 0.95rem;">
                Khoảng thời gian
              </label>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <n-date-picker v-model:value="startDate" type="date" placeholder="Từ ngày" clearable size="large" style="flex: 1; border-radius: 10px;" />
              <span style="color: var(--ef-text-tertiary); font-weight: 600;">→</span>
              <n-date-picker v-model:value="endDate" type="date" placeholder="Đến ngày" clearable size="large" style="flex: 1; border-radius: 10px;" />
            </div>
          </div>
        </div>

        <template #action>
          <div style="display: flex; justify-content: space-between; gap: 12px; padding-top: 8px;">
            <button class="ef-btn ef-btn-secondary" style="flex: 1; padding: 12px; border-radius: 12px; font-weight: 600;" @click="clearFilters">
              Đặt lại
            </button>
            <button class="ef-btn ef-btn-primary" style="flex: 1.5; padding: 12px; border-radius: 12px; font-weight: 600;" @click="applyFilters">
              Áp dụng bộ lọc
            </button>
          </div>
        </template>
      </n-card>
    </n-modal>

    <n-spin :show="txStore.loading && txStore.transactions.length === 0">
      <n-empty v-if="txStore.transactions.length === 0" description="Chưa có giao dịch nào" />
      <div v-else class="tx-list">
        <div 
          v-for="tx in txStore.transactions" 
          :key="tx.id" 
          class="tx-item ef-card"
          @click="openDetails(tx.id)"
        >
          <div class="tx-item__icon" :style="{ background: (tx.category_color || 'var(--ef-primary)') + '20', color: tx.category_color || 'var(--ef-primary)' }">
            <n-icon><component :is="getIconComponent(tx.category_icon)" /></n-icon>
          </div>
          <div class="tx-item__info">
            <div class="tx-item__title">{{ tx.title || tx.category_name || 'Giao dịch' }}</div>
            <div class="tx-item__meta">{{ tx.transaction_date }} · {{ tx.group_id ? 'Nhóm' : 'Cá nhân' }}</div>
          </div>
          <div class="tx-item__amount" :class="tx.transaction_type === 'income' ? 'tx-item__amount--income' : 'tx-item__amount--expense'">
            {{ tx.transaction_type === 'income' ? '+' : '-' }}{{ formatMoney(tx.amount) }}₫
          </div>
        </div>

        <!-- Loading more indicator -->
        <div v-if="loadingMore" style="display: flex; justify-content: center; align-items: center; padding: 20px 0;">
          <n-spin size="small" />
          <span style="margin-left: 8px; color: var(--ef-text-secondary); font-size: 0.9rem;">Đang tải thêm giao dịch...</span>
        </div>
        <div v-else-if="!txStore.hasMore && txStore.transactions.length > 0" style="text-align: center; padding: 20px 0; color: var(--ef-text-tertiary); font-size: 0.85rem;">
          Đã hiển thị tất cả giao dịch gần đây
        </div>
      </div>
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
            <h3 class="details-title">{{ selectedTxDetails.title || 'Không có tiêu đề' }}</h3>

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
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tx-list { display: flex; flex-direction: column; gap: 12px; padding-bottom: 32px; }
.tx-item { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: var(--ef-radius-lg); transition: transform 0.2s; cursor: pointer; }
.tx-item:active { transform: scale(0.98); }
.tx-item__icon { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.tx-item__info { flex: 1; min-width: 0; }
.tx-item__title { font-weight: 600; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ef-text); }
.tx-item__meta { font-size: 0.75rem; color: var(--ef-text-tertiary); margin-top: 4px; font-weight: 500; }
.tx-item__amount { font-weight: 700; font-size: 1rem; white-space: nowrap; }
.tx-item__amount--income { color: var(--ef-success); }
.tx-item__amount--expense { color: var(--ef-danger); }

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
  border-top: 1px dashed var(--n-border-color);
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
  border: 1px solid var(--n-border-color);
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
</style>
