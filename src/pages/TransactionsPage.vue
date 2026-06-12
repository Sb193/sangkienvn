<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { 
  NButton, NSpin, NEmpty, NIcon, NModal, NCard, NTag, 
  NPopconfirm, useMessage, NDescriptions, NDescriptionsItem 
} from 'naive-ui'
import { useTransactionsStore } from '@/stores/transactions'
import api from '@/services/api'
import { 
  CardOutline, GiftOutline, TrendingUpOutline, EllipsisHorizontalCircleOutline,
  RestaurantOutline, CarOutline, HomeOutline, FlashOutline, 
  GameControllerOutline, CartOutline, MedkitOutline, BookOutline,
  PricetagOutline, TrashOutline, CalendarOutline, LocationOutline,
  PeopleOutline, WalletOutline, DocumentTextOutline, AddOutline
} from '@vicons/ionicons5'

const router = useRouter()
const message = useMessage()
const txStore = useTransactionsStore()

const showDetailModal = ref(false)
const selectedTxDetails = ref<any>(null)
const loadingDetails = ref(false)

onMounted(() => { txStore.fetchTransactions() })

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
    <div class="page-header">
      <h1 class="ef-page-title">Giao dịch</h1>
      <button class="ef-btn ef-btn-primary ef-btn-sm" @click="router.push('/transactions/new')">
        <n-icon><AddOutline /></n-icon>
        Thêm mới
      </button>
    </div>

    <n-spin :show="txStore.loading">
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
            <n-popconfirm
              v-if="selectedTxDetails"
              @positive-click="handleDelete(selectedTxDetails.id)"
              positive-text="Xóa"
              negative-text="Hủy"
            >
              <template #trigger>
                <n-button type="error" ghost>
                  <template #icon>
                    <n-icon><TrashOutline /></n-icon>
                  </template>
                  Xóa giao dịch
                </n-button>
              </template>
              Bạn chắc chắn muốn xóa giao dịch này chứ? Hành động này không thể hoàn tác.
            </n-popconfirm>
            <n-button secondary @click="showDetailModal = false">Đóng</n-button>
          </div>
        </template>
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
