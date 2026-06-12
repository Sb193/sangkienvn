<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NSpin } from 'naive-ui'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { PieChart, LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import api from '@/services/api'
import type { ReportSummary, CategoryAggregate, DateAggregate } from '@/types'

use([PieChart, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

const loading = ref(true)
const summary = ref<ReportSummary | null>(null)
const byCategory = ref<CategoryAggregate[]>([])
const byDate = ref<DateAggregate[]>([])

onMounted(async () => {
  try {
    const { data } = await api.get('/reports/personal')
    summary.value = data.data.summary
    byCategory.value = data.data.byCategory
    byDate.value = data.data.byDate
  } finally { loading.value = false }
})

const pieOption = () => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  series: [{
    type: 'pie',
    radius: ['45%', '70%'],
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
    label: { show: true, fontSize: 12 },
    data: byCategory.value
      .filter((c) => c.transaction_type === 'expense')
      .map((c) => ({ name: c.category_name, value: c.total_amount, itemStyle: { color: c.category_color } })),
  }],
})

const lineOption = () => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 50, right: 20, top: 20, bottom: 30 },
  xAxis: { type: 'category' as const, data: byDate.value.filter((d) => d.transaction_type === 'expense').map((d) => d.date.substring(5)) },
  yAxis: { type: 'value' as const },
  series: [{
    type: 'line',
    smooth: true,
    areaStyle: { color: 'rgba(59,130,246,0.15)' },
    lineStyle: { color: '#3B82F6', width: 2 },
    itemStyle: { color: '#3B82F6' },
    data: byDate.value.filter((d) => d.transaction_type === 'expense').map((d) => d.total_amount),
  }],
})

function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount))
}
</script>

<template>
  <div>
    <h1 class="ef-page-title">Báo cáo</h1>

    <n-spin :show="loading">
      <div v-if="summary" class="report-summary">
        <div class="report-stat">
          <span class="report-stat__label">Chi tiêu</span>
          <span class="report-stat__value report-stat__value--expense">{{ formatMoney(summary.totalSpent) }}₫</span>
        </div>
        <div class="report-stat">
          <span class="report-stat__label">Thu nhập</span>
          <span class="report-stat__value report-stat__value--income">{{ formatMoney(summary.totalIncome) }}₫</span>
        </div>
        <div class="report-stat">
          <span class="report-stat__label">Tiết kiệm</span>
          <span class="report-stat__value">{{ formatMoney(summary.netSavings) }}₫</span>
        </div>
      </div>

      <div v-if="byCategory.length > 0" class="ef-card chart-card">
        <h3 class="chart-title">Phân bổ chi tiêu theo danh mục</h3>
        <v-chart :option="pieOption()" autoresize style="height: 280px" />
      </div>

      <div v-if="byDate.length > 0" class="ef-card chart-card">
        <h3 class="chart-title">Biến động chi tiêu theo ngày</h3>
        <v-chart :option="lineOption()" autoresize style="height: 240px" />
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.report-summary { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.report-stat { flex: 1; min-width: 120px; background: var(--ef-surface); border: 1px solid var(--ef-border-light); border-radius: var(--ef-radius); padding: 16px; text-align: center; }
.report-stat__label { display: block; font-size: 0.8rem; color: var(--ef-text-tertiary); margin-bottom: 4px; }
.report-stat__value { font-size: 1.15rem; font-weight: 700; }
.report-stat__value--expense { color: var(--ef-danger); }
.report-stat__value--income { color: var(--ef-success); }
.chart-card { margin-bottom: 16px; }
.chart-title { font-size: 0.95rem; font-weight: 600; margin-bottom: 12px; }
</style>
