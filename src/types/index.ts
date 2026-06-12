// ─── User ──────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  provider: 'email' | 'google' | 'facebook'
  email_verified_at?: string
  created_at: string
}

export interface UserSettings {
  user_id: string
  default_currency: string
  timezone: string
  language: 'vi' | 'en'
  email_notification: number
  telegram_notification: number
  push_notification: number
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  fullName: string
}

export interface AuthResponse {
  user: User
  accessToken: string
}

// ─── Category ──────────────────────────────────────────────────────────────
export interface Category {
  id: string
  user_id: string | null
  name: string
  icon: string
  color: string
  type: 'income' | 'expense'
}

// ─── Transaction ───────────────────────────────────────────────────────────
export interface Transaction {
  id: string
  group_id: string | null
  created_by: string
  payer_user_id: string
  category_id: string | null
  amount: number
  currency: string
  transaction_type: 'income' | 'expense'
  split_type: string | null
  title: string
  note: string
  transaction_date: string
  attachment_url?: string
  address?: string
  created_at: string
  category_name?: string
  category_icon?: string
  category_color?: string
  warning?: string
  payer_name?: string
  creator_name?: string
  group_name?: string
}

export interface TransactionParticipant {
  userId: string
  shareValue?: number
}

export interface CreateTransactionPayload {
  amount: number
  categoryId?: string
  transactionType: 'income' | 'expense'
  title: string
  note?: string
  transactionDate: string
  groupId?: string
  payerUserId?: string
  splitType?: 'equal' | 'percent' | 'fixed' | 'weight'
  participants?: TransactionParticipant[]
  attachmentUrl?: string
  address?: string
}

// ─── Group ─────────────────────────────────────────────────────────────────
export interface Group {
  id: string
  name: string
  description?: string
  avatar_url?: string
  join_code: string
  created_by: string
  created_at: string
}

export interface GroupMember {
  user_id: string
  role: 'owner' | 'admin' | 'member'
  full_name: string
  email: string
  avatar_url?: string
  joined_at: string
}

// ─── Debt ──────────────────────────────────────────────────────────────────
export interface DebtSuggestion {
  from: string
  to: string
  amount: number
}

export interface BalanceEntry {
  userId: string
  amount: number
}

// ─── Settlement ────────────────────────────────────────────────────────────
export interface Settlement {
  id: string
  group_id: string
  from_user_id: string
  to_user_id: string
  amount: number
  proof_image_url?: string
  note?: string
  created_at: string
  from_user_name?: string
  to_user_name?: string
}

// ─── Fund ──────────────────────────────────────────────────────────────────
export interface GroupFund {
  id: string
  group_id: string
  balance: number
  manager_role: string
}

export interface FundTransaction {
  id: string
  fund_id: string
  created_by: string
  type: 'deposit' | 'withdraw'
  amount: number
  note?: string
  created_at: string
  full_name?: string
}

// ─── Budget ────────────────────────────────────────────────────────────────
export interface Budget {
  id: string
  user_id: string
  category_id: string
  amount: number
  period: 'monthly' | 'yearly'
  start_date: string
  end_date: string
  category_name?: string
  category_icon?: string
  category_color?: string
  current_spent?: number
  percent_used?: number
  status?: 'normal' | 'warning' | 'exceeded'
}

// ─── Notification ──────────────────────────────────────────────────────────
export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  content: string
  is_read: number
  created_at: string
}

// ─── Activity Log ──────────────────────────────────────────────────────────
export interface ActivityLog {
  id: string
  group_id: string
  user_id: string
  entity_type: string
  entity_id: string
  action: string
  metadata_json: string
  created_at: string
  full_name?: string
  avatar_url?: string
}

// ─── Report ────────────────────────────────────────────────────────────────
export interface ReportSummary {
  totalSpent: number
  totalIncome: number
  netSavings: number
  startDate: string
  endDate: string
}

export interface CategoryAggregate {
  category_id: string
  category_name: string
  category_color: string
  category_icon: string
  transaction_type?: string
  total_amount: number
}

export interface DateAggregate {
  date: string
  transaction_type?: string
  total_amount: number
}

// ─── API ───────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
  }
}
