import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import type { Transaction, Category, CreateTransactionPayload } from '@/types'

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const lastWarning = ref<string | null>(null)
  const hasMore = ref(true)
  const total = ref(0)

  async function fetchCategories() {
    const { data } = await api.get('/categories')
    categories.value = data.data
  }

  async function fetchTransactions(filters: Record<string, any> = {}, append = false) {
    loading.value = true
    try {
      const params = { ...filters }
      if (!params.groupId) {
        params.personalOnly = 'true'
      }
      const { data } = await api.get('/transactions', { params })
      const txList = data.data.transactions || []
      total.value = data.data.total || 0
      
      if (append) {
        transactions.value = [...transactions.value, ...txList]
      } else {
        transactions.value = txList
      }
      hasMore.value = transactions.value.length < total.value
    } finally {
      loading.value = false
    }
  }

  async function createTransaction(payload: CreateTransactionPayload) {
    const { data } = await api.post('/transactions', payload)
    lastWarning.value = data.data.warning || null
    await fetchTransactions()
    return data.data
  }

  async function deleteTransaction(id: string) {
    await api.delete(`/transactions/${id}`)
    transactions.value = transactions.value.filter((t) => t.id !== id)
  }

  return { transactions, categories, loading, lastWarning, hasMore, total, fetchCategories, fetchTransactions, createTransaction, deleteTransaction }
})
