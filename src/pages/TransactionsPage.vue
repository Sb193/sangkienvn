<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NSpin, NEmpty, NIcon } from 'naive-ui'
import { useTransactionsStore } from '@/stores/transactions'
import { 
  CardOutline, GiftOutline, TrendingUpOutline, EllipsisHorizontalCircleOutline,
  RestaurantOutline, CarOutline, HomeOutline, FlashOutline, 
  GameControllerOutline, CartOutline, MedkitOutline, BookOutline,
  PricetagOutline
} from '@vicons/ionicons5'

const router = useRouter()
const txStore = useTransactionsStore()

onMounted(() => { txStore.fetchTransactions() })

function formatMoney(amount: any) {
  const num = Number(amount)
  if (isNaN(num)) return '0'
  return new Intl.NumberFormat('vi-VN').format(Math.round(num))
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
      <n-button type="primary" size="small" @click="router.push('/transactions/new')">+ Thêm mới</n-button>
    </div>

    <n-spin :show="txStore.loading">
      <n-empty v-if="txStore.transactions.length === 0" description="Chưa có giao dịch nào" />
      <div v-else class="tx-list">
        <div v-for="tx in txStore.transactions" :key="tx.id" class="tx-item ef-card">
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
</style>
