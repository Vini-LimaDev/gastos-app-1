import axios from 'axios'

// Em produção (Vercel): VITE_API_URL = https://seu-backend.up.railway.app
// Em dev: vazio — o proxy do vite.config.js redireciona /api → localhost:8012
const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  confirmEmail: (tokenHash, type) =>
    api.get('/api/auth/confirm', { params: { token_hash: tokenHash, type } }),
  confirmToken: (accessToken) =>
    api.post('/api/auth/confirm-token', { access_token: accessToken }),
  updateProfile: (data) => api.put('/api/auth/profile', data),
}

// ── Transactions ──────────────────────────────────────
export const transactionsAPI = {
  list: (params) => api.get('/api/transactions/', { params }),
  create: (data) => api.post('/api/transactions/', data),
  update: (id, data) => api.put(`/api/transactions/${id}`, data),
  delete: (id) => api.delete(`/api/transactions/${id}`),
  monthlySummary: (year, month) =>
    api.get('/api/transactions/summary/monthly', { params: { year, month } }),
  yearlySummary: (year) =>
    api.get('/api/transactions/summary/yearly', { params: { year } }),
  deleteInstallmentGroup: (groupId) =>
    api.delete(`/api/transactions/installment-group/${groupId}`),
}

// ── Recurring Templates ───────────────────────────────
export const recurringAPI = {
  list: () => api.get('/api/recurring-templates/'),
  create: (data) => api.post('/api/recurring-templates/', data),
  update: (id, data) => api.put(`/api/recurring-templates/${id}`, data),
  delete: (id) => api.delete(`/api/recurring-templates/${id}`),
  processNow: () => api.post('/api/recurring/process'),
}

// ── Budgets ───────────────────────────────────────────
export const budgetsAPI = {
  list: (params) => api.get('/api/budgets/', { params }),
  create: (data) => api.post('/api/budgets/', data),
  update: (id, data) => api.put(`/api/budgets/${id}`, data),
  delete: (id) => api.delete(`/api/budgets/${id}`),
}

// ── Goals ─────────────────────────────────────────────
export const goalsAPI = {
  list: () => api.get('/api/goals/'),
  create: (data) => api.post('/api/goals/', data),
  update: (id, data) => api.put(`/api/goals/${id}`, data),
  delete: (id) => api.delete(`/api/goals/${id}`),
}

// ── Categories ────────────────────────────────────────
export const categoriesAPI = {
  list: () => api.get('/api/categories/'),
  create: (data) => api.post('/api/categories/', data),
  update: (id, data) => api.put(`/api/categories/${id}`, data),
  delete: (id) => api.delete(`/api/categories/${id}`),
}

// ── Cards ─────────────────────────────────────────────
export const cardsAPI = {
  list: () => api.get('/api/cards/'),
  create: (data) => api.post('/api/cards/', data),
  update: (id, data) => api.put(`/api/cards/${id}`, data),
  delete: (id) => api.delete(`/api/cards/${id}`),
}

// ── Payments ──────────────────────────────────────────
export const paymentsAPI = {
  getStatus: () => api.get('/api/payments/status'),
  createSubscription: (planType) =>
    api.post('/api/payments/create-subscription', { plan_type: planType }),
}

export default api