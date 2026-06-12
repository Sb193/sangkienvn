import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import type { Transaction, Category, CreateTransactionPayload } from '@/types'

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const lastWarning = ref<string | null>(null)

  async function fetchCategories() {
    const { data } = await api.get('/categories')
    categories.value = data.data
  }

  async function fetchTransactions(filters: Record<string, string> = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/transactions', { params: filters })
      transactions.value = data.data.transactions || []
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

  return { transactions, categories, loading, lastWarning, fetchCategories, fetchTransactions, createTransaction, deleteTransaction }
})
