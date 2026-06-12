<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NSpin, NEmpty, NProgress } from 'naive-ui'
import api from '@/services/api'
import type { Budget } from '@/types'

const budgets = ref<Budget[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get('/budgets')
    budgets.value = data.data
  } finally { loading.value = false }
})

function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount))
}

function statusColor(status?: string) {
  if (status === 'exceeded') return 'error'
  if (status === 'warning') return 'warning'
  return 'success'
}
</script>

<template>
  <div>
    <h1 class="ef-page-title">Ngân sách</h1>

    <n-spin :show="loading">
      <n-empty v-if="budgets.length === 0" description="Chưa thiết lập ngân sách nào" />
      <div v-else class="budget-grid">
        <div v-for="b in budgets" :key="b.id" class="budget-card ef-card">
          <div class="budget-card__header">
            <div class="budget-card__category">
              <span class="budget-card__icon" :style="{ background: b.category_color }">{{ b.category_icon }}</span>
              <span class="budget-card__name">{{ b.category_name }}</span>
            </div>
            <span class="ef-badge" :class="{ 'ef-badge--success': b.status === 'normal', 'ef-badge--warning': b.status === 'warning', 'ef-badge--danger': b.status === 'exceeded' }">
              {{ b.status === 'exceeded' ? 'Vượt' : b.status === 'warning' ? 'Cảnh báo' : 'Bình thường' }}
            </span>
          </div>
          <n-progress type="line" :percentage="Math.min(b.percent_used || 0, 100)" :status="statusColor(b.status)" :show-indicator="false" style="margin: 12px 0 8px" />
          <div class="budget-card__numbers">
            <span>{{ formatMoney(b.current_spent || 0) }}₫</span>
            <span class="budget-card__sep">/</span>
            <span>{{ formatMoney(b.amount) }}₫</span>
            <span class="budget-card__pct">({{ Math.round(b.percent_used || 0) }}%)</span>
          </div>
          <div class="budget-card__period">{{ b.start_date }} → {{ b.end_date }}</div>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.budget-grid { display: flex; flex-direction: column; gap: 12px; }
.budget-card__header { display: flex; justify-content: space-between; align-items: center; }
.budget-card__category { display: flex; align-items: center; gap: 8px; }
.budget-card__icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; }
.budget-card__name { font-weight: 600; font-size: 0.95rem; }
.budget-card__numbers { font-size: 0.85rem; font-weight: 600; color: var(--ef-text-secondary); }
.budget-card__sep { margin: 0 4px; }
.budget-card__pct { color: var(--ef-text-tertiary); margin-left: 6px; font-weight: 500; }
.budget-card__period { font-size: 0.75rem; color: var(--ef-text-tertiary); margin-top: 6px; }
</style>
