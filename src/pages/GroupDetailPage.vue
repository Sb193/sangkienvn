<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { NTabs, NTabPane, NSpin, NEmpty, NButton, useMessage } from 'naive-ui'
import { useGroupsStore } from '@/stores/groups'
import api from '@/services/api'
import type { DebtSuggestion, Settlement, ActivityLog, GroupFund, FundTransaction } from '@/types'

const route = useRoute()
const groupsStore = useGroupsStore()
const message = useMessage()
const groupId = route.params.id as string
const loading = ref(true)

const debts = ref<DebtSuggestion[]>([])
const settlements = ref<Settlement[]>([])
const logs = ref<ActivityLog[]>([])
const fund = ref<GroupFund | null>(null)
const fundHistory = ref<FundTransaction[]>([])

onMounted(async () => {
  try {
    await groupsStore.fetchGroupDetail(groupId)
    await Promise.all([fetchDebts(), fetchSettlements(), fetchLogs(), fetchFund()])
  } finally {
    loading.value = false
  }
})

async function fetchDebts() {
  try { const { data } = await api.get(`/groups/${groupId}/debts`); debts.value = data.data.debts } catch {}
}
async function fetchSettlements() {
  try { const { data } = await api.get(`/groups/${groupId}/settlements`); settlements.value = data.data } catch {}
}
async function fetchLogs() {
  try { const { data } = await api.get(`/groups/${groupId}/logs`); logs.value = data.data } catch {}
}
async function fetchFund() {
  try {
    const { data } = await api.get(`/groups/${groupId}/fund`)
    fund.value = data.data.fund
    fundHistory.value = data.data.history
  } catch {}
}

function getMemberName(userId: string) {
  return groupsStore.members.find((m) => m.user_id === userId)?.full_name || userId.substring(0, 8)
}
function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount))
}
</script>

<template>
  <div>
    <h1 class="ef-page-title">{{ groupsStore.currentGroup?.name || 'Nhóm' }}</h1>

    <n-spin :show="loading">
      <n-tabs type="line" animated>
        <!-- Members Tab -->
        <n-tab-pane name="members" tab="Thành viên">
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

        <!-- Debts Tab -->
        <n-tab-pane name="debts" tab="Công nợ">
          <n-empty v-if="debts.length === 0" description="Không có công nợ" />
          <div v-else class="debt-list">
            <div v-for="(d, i) in debts" :key="i" class="debt-item ef-card">
              <span class="debt-item__from">{{ getMemberName(d.from) }}</span>
              <span class="debt-item__arrow">→ trả →</span>
              <span class="debt-item__to">{{ getMemberName(d.to) }}</span>
              <span class="debt-item__amount">{{ formatMoney(d.amount) }}₫</span>
            </div>
          </div>
        </n-tab-pane>

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

        <!-- Settlements Tab -->
        <n-tab-pane name="settlements" tab="Quyết toán">
          <n-empty v-if="settlements.length === 0" description="Chưa có quyết toán" />
          <div v-else class="settlement-list">
            <div v-for="s in settlements" :key="s.id" class="settlement-item ef-card">
              <span>{{ s.from_user_name || getMemberName(s.from_user_id) }}</span>
              <span class="debt-item__arrow">→ trả →</span>
              <span>{{ s.to_user_name || getMemberName(s.to_user_id) }}</span>
              <span class="debt-item__amount">{{ formatMoney(s.amount) }}₫</span>
            </div>
          </div>
        </n-tab-pane>

        <!-- Activity Log Tab -->
        <n-tab-pane name="logs" tab="Hoạt động">
          <n-empty v-if="logs.length === 0" description="Chưa có hoạt động" />
          <div v-else class="log-list">
            <div v-for="log in logs" :key="log.id" class="log-item ef-card">
              <div class="log-item__user">{{ log.full_name }}</div>
              <div class="log-item__action">{{ log.action }} · {{ log.entity_type }}</div>
              <div class="log-item__date">{{ log.created_at }}</div>
            </div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-spin>
  </div>
</template>

<style scoped>
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
</style>
