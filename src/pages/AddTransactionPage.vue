<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NInput, NButton, NDatePicker, useMessage, NIcon } from 'naive-ui'
import { 
  ArrowBackOutline, WalletOutline, CashOutline,
  CardOutline, GiftOutline, TrendingUpOutline, EllipsisHorizontalCircleOutline,
  RestaurantOutline, CarOutline, HomeOutline, FlashOutline, 
  GameControllerOutline, CartOutline, MedkitOutline, BookOutline,
  PricetagOutline
} from '@vicons/ionicons5'
import { useTransactionsStore } from '@/stores/transactions'

const router = useRouter()
const txStore = useTransactionsStore()
const message = useMessage()

// Map string icon names from DB to Ionicons
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

const getIconComponent = (iconName: string) => {
  return iconMap[iconName] || PricetagOutline
}

const form = ref({
  title: '',
  amount: null as number | null,
  categoryId: null as string | null,
  transactionType: 'expense' as 'income' | 'expense',
  transactionDate: Date.now(),
  note: '',
})

onMounted(() => { txStore.fetchCategories() })

const categoryList = computed(() => txStore.categories
  .filter((c) => c.type === form.value.transactionType)
)

watch(() => form.value.transactionType, () => {
  form.value.categoryId = null
})

// Currency formatter for the big input
const formattedAmount = computed({
  get: () => {
    if (!form.value.amount) return ''
    return form.value.amount.toLocaleString('vi-VN')
  },
  set: (val: string) => {
    const raw = val.replace(/[^0-9]/g, '')
    form.value.amount = raw ? parseInt(raw, 10) : null
  }
})

// Dynamic font size for the amount input
const dynamicFontSize = computed(() => {
  const len = formattedAmount.value.length
  if (len < 7) return '3.5rem' // 100,000
  if (len < 10) return '2.5rem' // 10,000,000
  if (len < 13) return '2rem' // 1,000,000,000
  return '1.5rem'
})

async function handleSubmit() {
  if (!form.value.amount || form.value.amount <= 0) {
    message.warning('Vui lòng nhập số tiền hợp lệ')
    return
  }
  
  let finalTitle = form.value.title.trim()
  if (!finalTitle) {
    if (form.value.categoryId) {
      const cat = txStore.categories.find(c => c.id === form.value.categoryId)
      if (cat) {
        finalTitle = cat.name
      } else {
        message.warning('Vui lòng nhập tiêu đề hoặc chọn danh mục')
        return
      }
    } else {
      message.warning('Vui lòng nhập tiêu đề hoặc chọn danh mục')
      return
    }
  }

  try {
    const dateStr = new Date(form.value.transactionDate).toISOString().substring(0, 10)
    await txStore.createTransaction({
      title: finalTitle,
      amount: form.value.amount,
      categoryId: form.value.categoryId || undefined,
      transactionType: form.value.transactionType,
      transactionDate: dateStr,
      note: form.value.note,
    })
    if (txStore.lastWarning) {
      message.warning(txStore.lastWarning, { duration: 5000 })
    }
    message.success('Thêm giao dịch thành công! 🎉')
    router.push('/transactions')
  } catch (err: any) {
    message.error(err.response?.data?.error?.message || 'Thêm giao dịch thất bại')
  }
}
</script>

<template>
  <div class="add-tx-container">
    <!-- Header -->
    <header class="tx-header">
      <button class="icon-btn" @click="router.back()">
        <n-icon size="24"><ArrowBackOutline /></n-icon>
      </button>
      <h2>Giao dịch mới</h2>
      <div style="width: 24px"></div> <!-- Spacer -->
    </header>

    <!-- Type Switcher -->
    <div class="type-switcher-wrap">
      <div class="type-switcher">
        <button 
          class="switch-btn" 
          :class="{ active: form.transactionType === 'expense' }"
          @click="form.transactionType = 'expense'"
        >
          Chi tiêu
        </button>
        <button 
          class="switch-btn" 
          :class="{ active: form.transactionType === 'income', income: true }"
          @click="form.transactionType = 'income'"
        >
          Thu nhập
        </button>
      </div>
    </div>

    <!-- Amount Input -->
    <div class="amount-section" :class="form.transactionType">
      <div class="currency-symbol" :style="{ fontSize: dynamicFontSize }">₫</div>
      <input 
        v-model="formattedAmount" 
        type="text" 
        inputmode="numeric" 
        class="amount-input" 
        placeholder="0" 
        :style="{ fontSize: dynamicFontSize }"
      />
    </div>

    <!-- Details Card -->
    <div class="details-card">
      <div class="input-group">
        <div class="input-icon"><n-icon><WalletOutline/></n-icon></div>
        <n-input v-model:value="form.title" placeholder="Tiêu đề (VD: Ăn trưa, Đổ xăng...)" size="large" class="custom-input" :bordered="false" />
      </div>
      <div class="divider"></div>

      <!-- Category Scrollable List -->
      <div class="category-scroll-container">
        <div 
          v-for="cat in categoryList" 
          :key="cat.id"
          class="category-item"
          :class="{ selected: form.categoryId === cat.id }"
          @click="form.categoryId = cat.id"
        >
          <div class="cat-icon" :style="{ backgroundColor: form.categoryId === cat.id ? cat.color : cat.color + '15', color: form.categoryId === cat.id ? '#fff' : cat.color }">
            <n-icon><component :is="getIconComponent(cat.icon)" /></n-icon>
          </div>
          <span class="cat-name" :style="{ color: form.categoryId === cat.id ? 'var(--ef-text)' : 'var(--ef-text-secondary)' }">{{ cat.name }}</span>
        </div>
      </div>
      <div class="divider"></div>

      <div class="input-group">
        <div class="input-icon" style="font-size: 1.2rem;">📅</div>
        <n-date-picker v-model:value="form.transactionDate" type="date" size="large" class="custom-input" :bordered="false" />
      </div>
      <div class="divider"></div>

      <div class="input-group note-group">
        <div class="input-icon" style="font-size: 1.2rem;">📝</div>
        <n-input v-model:value="form.note" type="textarea" placeholder="Ghi chú thêm (Không bắt buộc)..." class="custom-input" :bordered="false" :autosize="{ minRows: 2, maxRows: 4 }" />
      </div>
    </div>

    <!-- Submit Button -->
    <div class="submit-section">
      <button class="submit-btn" :class="form.transactionType" @click="handleSubmit">
        Lưu giao dịch
      </button>
    </div>
  </div>
</template>

<style scoped>
.add-tx-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 600px;
  margin: 0 auto;
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Header */
.tx-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.tx-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ef-text);
  margin: 0;
}
.icon-btn {
  background: transparent;
  border: none;
  color: var(--ef-text);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  transition: background 0.2s;
}
.icon-btn:active { background: var(--ef-surface-hover); }

/* Switcher */
.type-switcher-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}
.type-switcher {
  display: flex;
  background: var(--ef-border-light);
  border-radius: 100px;
  padding: 4px;
  position: relative;
}
.switch-btn {
  flex: 1;
  padding: 10px 32px;
  border-radius: 100px;
  border: none;
  background: transparent;
  color: var(--ef-text-secondary);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 1;
}
.switch-btn.active {
  background: white;
  color: var(--ef-danger);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.switch-btn.income.active {
  color: var(--ef-success);
}

/* Amount Input */
.amount-section {
  display: flex;
  justify-content: center;
  align-items: baseline;
  margin-bottom: 40px;
  gap: 8px;
  color: var(--ef-danger);
  transition: color 0.3s ease;
}
.amount-section.income { color: var(--ef-success); }

.currency-symbol {
  font-size: 2.5rem; /* Base fallback */
  font-weight: 700;
  transition: font-size 0.2s ease;
}
.amount-input {
  font-size: 3.5rem; /* Base fallback */
  font-weight: 800;
  background: transparent;
  border: none;
  outline: none;
  color: inherit;
  width: 100%;
  text-align: left;
  max-width: 300px;
  padding: 0;
  transition: font-size 0.2s ease;
}
.amount-input::placeholder { color: rgba(0,0,0,0.15); }

/* Details Card */
.details-card {
  background: var(--ef-surface);
  border-radius: var(--ef-radius-lg);
  box-shadow: var(--ef-shadow-sm);
  padding: 8px 16px;
  margin-bottom: 120px;
}
.input-group {
  display: flex;
  align-items: center;
  padding: 8px 0;
}
.note-group { align-items: flex-start; padding-top: 16px; }
.input-icon {
  width: 32px;
  display: flex;
  justify-content: center;
  color: var(--ef-text-tertiary);
  font-size: 1.4rem;
  margin-right: 12px;
}
.divider {
  height: 1px;
  background: var(--ef-border-light);
  margin-left: 44px;
}
:deep(.custom-input .n-input__input-el),
:deep(.custom-input .n-base-selection-input) {
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--ef-text);
}
:deep(.custom-input.n-input--textarea) { margin-top: -6px; }

/* Category Scroll Container */
.category-scroll-container {
  display: flex;
  overflow-x: auto;
  gap: 16px;
  padding: 16px 4px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.category-scroll-container::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  min-width: 64px;
  transition: transform 0.2s ease;
}
.category-item:active { transform: scale(0.95); }
.cat-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}
.category-item.selected .cat-icon {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.cat-name {
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  transition: color 0.2s;
}

/* Submit Button */
.submit-section {
  position: fixed;
  bottom: calc(var(--ef-bottom-nav-height) + 16px);
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: center;
  z-index: 10;
}
.submit-btn {
  width: 100%;
  max-width: 600px;
  padding: 16px;
  border-radius: 100px;
  border: none;
  background: linear-gradient(135deg, #FF6B6B, var(--ef-danger));
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.submit-btn:active { transform: scale(0.96); }
.submit-btn.income {
  background: linear-gradient(135deg, #34D399, var(--ef-success));
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
}

@media (min-width: 769px) {
  .submit-section {
    position: static;
    margin-top: 32px;
  }
  .details-card { margin-bottom: 0; }
  .amount-input { max-width: 400px; text-align: center; }
  .amount-section { justify-content: center; }
}
</style>
