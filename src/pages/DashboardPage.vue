<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NSpin, NEmpty, NIcon } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useTransactionsStore } from '@/stores/transactions'
import api from '@/services/api'
import type { Budget, ReportSummary, CategoryAggregate } from '@/types'
import { 
  CardOutline, GiftOutline, TrendingUpOutline, EllipsisHorizontalCircleOutline,
  RestaurantOutline, CarOutline, HomeOutline, FlashOutline, 
  GameControllerOutline, CartOutline, MedkitOutline, BookOutline,
  PricetagOutline
} from '@vicons/ionicons5'

const router = useRouter()
const auth = useAuthStore()
const txStore = useTransactionsStore()
const loading = ref(true)

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

const report = ref<{ summary: ReportSummary; byCategory: CategoryAggregate[] } | null>(null)
const budgets = ref<Budget[]>([])

onMounted(async () => {
  try {
    await Promise.all([
      txStore.fetchTransactions({ limit: '5' }),
      txStore.fetchCategories(),
      fetchReport(),
      fetchBudgets(),
    ])
  } finally {
    loading.value = false
  }
})

async function fetchReport() {
  try {
    const { data } = await api.get('/reports/personal')
    report.value = data.data
  } catch { /* ignore */ }
}

async function fetchBudgets() {
  try {
    const { data } = await api.get('/budgets')
    budgets.value = data.data
  } catch { /* ignore */ }
}

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Chào buổi sáng'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
})

const warningBudgets = computed(() => budgets.value.filter((b) => b.status !== 'normal'))

function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount))
}
</script>

<template>
  <div class="dashboard">
    <h1 class="ef-page-title">{{ greeting }}, {{ auth.user?.full_name?.split(' ').pop() }}! 👋</h1>

    <n-spin :show="loading">
      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card summary-card--expense">
          <div class="summary-card__label">Chi tiêu tháng này</div>
          <div class="summary-card__value">{{ formatMoney(report?.summary?.totalSpent || 0) }}<span class="summary-card__currency">₫</span></div>
        </div>
        <div class="summary-card summary-card--income">
          <div class="summary-card__label">Thu nhập tháng này</div>
          <div class="summary-card__value">{{ formatMoney(report?.summary?.totalIncome || 0) }}<span class="summary-card__currency">₫</span></div>
        </div>
        <div class="summary-card summary-card--savings">
          <div class="summary-card__label">Tiết kiệm</div>
          <div class="summary-card__value">{{ formatMoney(report?.summary?.netSavings || 0) }}<span class="summary-card__currency">₫</span></div>
        </div>
      </div>

      <!-- Budget Warnings -->
      <div v-if="warningBudgets.length > 0" class="section">
        <h2 class="section__title">⚠️ Cảnh báo ngân sách</h2>
        <div v-for="b in warningBudgets" :key="b.id" class="budget-alert ef-card" :class="{ 'budget-alert--exceeded': b.status === 'exceeded' }">
          <div class="budget-alert__info">
            <span class="budget-alert__category">{{ b.category_name }}</span>
            <span class="ef-badge" :class="b.status === 'exceeded' ? 'ef-badge--danger' : 'ef-badge--warning'">
              {{ b.status === 'exceeded' ? 'Vượt hạn mức' : 'Gần hạn mức' }}
            </span>
          </div>
          <div class="budget-alert__bar">
            <div class="budget-alert__fill" :style="{ width: Math.min(b.percent_used || 0, 100) + '%', background: b.status === 'exceeded' ? 'var(--ef-danger)' : 'var(--ef-warning)' }"></div>
          </div>
          <div class="budget-alert__numbers">{{ formatMoney(b.current_spent || 0) }}₫ / {{ formatMoney(b.amount) }}₫</div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="section">
        <div class="section__header">
          <h2 class="section__title">Giao dịch gần đây</h2>
          <a class="section__link" @click="router.push('/transactions')">Xem tất cả →</a>
        </div>

        <div v-if="txStore.transactions.length === 0" class="ef-empty">
          <div class="ef-empty__icon">📋</div>
          <div class="ef-empty__text">Chưa có giao dịch nào</div>
        </div>

        <div v-else class="tx-list">
          <div v-for="tx in txStore.transactions" :key="tx.id" class="tx-item ef-card">
            <div class="tx-item__icon" :style="{ background: (tx.category_color || 'var(--ef-primary)') + '20', color: tx.category_color || 'var(--ef-primary)' }">
              <n-icon><component :is="getIconComponent(tx.category_icon)" /></n-icon>
            </div>
            <div class="tx-item__info">
              <div class="tx-item__title">{{ tx.title || tx.category_name || 'Giao dịch' }}</div>
              <div class="tx-item__date">{{ tx.transaction_date }}</div>
            </div>
            <div class="tx-item__amount" :class="tx.transaction_type === 'income' ? 'tx-item__amount--income' : 'tx-item__amount--expense'">
              {{ tx.transaction_type === 'income' ? '+' : '-' }}{{ formatMoney(tx.amount) }}₫
            </div>
          </div>
        </div>
      </div>

      <!-- Expense by Category -->
      <div v-if="report?.byCategory?.length" class="section">
        <h2 class="section__title">Phân bổ chi tiêu</h2>
        <div class="cat-grid">
          <div v-for="cat in report.byCategory.filter((c) => c.transaction_type === 'expense').slice(0, 6)" :key="cat.category_id" class="cat-chip">
            <span class="cat-chip__icon" :style="{ background: (cat.category_color || 'var(--ef-primary)') + '20', color: cat.category_color || 'var(--ef-primary)' }">
              <n-icon><component :is="getIconComponent(cat.category_icon)" /></n-icon>
            </span>
            <span class="cat-chip__name">{{ cat.category_name }}</span>
            <span class="cat-chip__amount">{{ formatMoney(cat.total_amount) }}₫</span>
          </div>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.dashboard { max-width: 720px; }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}

.summary-card {
  padding: 20px;
  border-radius: var(--ef-radius);
  color: white;
  position: relative;
  overflow: hidden;
}
.summary-card::after {
  content: '';
  position: absolute;
  top: -30px;
  right: -30px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
}
.summary-card--expense { background: linear-gradient(135deg, #EF4444, #F97316); }
.summary-card--income  { background: linear-gradient(135deg, #22C55E, #10B981); }
.summary-card--savings { background: linear-gradient(135deg, var(--ef-primary), #8B5CF6); }
.summary-card__label { font-size: 0.8rem; font-weight: 500; opacity: 0.9; margin-bottom: 6px; }
.summary-card__value { font-size: 1.5rem; font-weight: 800; }
.summary-card__currency { font-size: 0.85rem; font-weight: 500; margin-left: 2px; }

.section { margin-bottom: 28px; }
.section__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section__title { font-size: 1.05rem; font-weight: 700; color: var(--ef-text); margin-bottom: 12px; }
.section__link { font-size: 0.85rem; cursor: pointer; font-weight: 500; }

.tx-list { display: flex; flex-direction: column; gap: 8px; }
.tx-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.tx-item__icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 1.15rem; flex-shrink: 0;
}
.tx-item__info { flex: 1; min-width: 0; }
.tx-item__title { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tx-item__date { font-size: 0.75rem; color: var(--ef-text-tertiary); margin-top: 2px; }
.tx-item__amount { font-weight: 700; font-size: 0.9rem; white-space: nowrap; }
.tx-item__amount--income { color: var(--ef-success); }
.tx-item__amount--expense { color: var(--ef-danger); }

.budget-alert { margin-bottom: 8px; }
.budget-alert--exceeded { border-left: 3px solid var(--ef-danger); }
.budget-alert__info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.budget-alert__category { font-weight: 600; font-size: 0.9rem; }
.budget-alert__bar { height: 6px; background: var(--ef-border-light); border-radius: 100px; overflow: hidden; margin-bottom: 6px; }
.budget-alert__fill { height: 100%; border-radius: 100px; transition: width 0.5s ease; }
.budget-alert__numbers { font-size: 0.75rem; color: var(--ef-text-secondary); }

.cat-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.cat-chip {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; background: var(--ef-surface); border: 1px solid var(--ef-border-light);
  border-radius: 100px; font-size: 0.8rem;
}
.cat-chip__icon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; }
.cat-chip__name { font-weight: 500; }
.cat-chip__amount { font-weight: 700; color: var(--ef-text-secondary); }
</style>
