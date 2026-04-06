import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
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
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  confirmEmail: (tokenHash, type) =>
    api.get('/auth/confirm', { params: { token_hash: tokenHash, type } }),
  confirmToken: (accessToken) =>                                    // ← ADICIONA
    api.post('/auth/confirm-token', { access_token: accessToken }),
}

// ── Transactions ──────────────────────────────────────
export const transactionsAPI = {
  list: (params) => api.get('/transactions/', { params }),
  create: (data) => api.post('/transactions/', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  monthlySummary: (year, month) =>
    api.get('/transactions/summary/monthly', { params: { year, month } }),
  yearlySummary: (year) =>
    api.get('/transactions/summary/yearly', { params: { year } }),
  deleteInstallmentGroup: (groupId) =>
    api.delete(`/transactions/installment-group/${groupId}`),
}

// ── Recurring Templates ───────────────────────────────
export const recurringAPI = {
  list: () => api.get('/recurring-templates/'),
  create: (data) => api.post('/recurring-templates/', data),
  update: (id, data) => api.put(`/recurring-templates/${id}`, data),
  delete: (id) => api.delete(`/recurring-templates/${id}`),
  processNow: () => api.post('/recurring/process'),
}

// ── Budgets ───────────────────────────────────────────
export const budgetsAPI = {
  list: (params) => api.get('/budgets/', { params }),
  create: (data) => api.post('/budgets/', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
}

// ── Goals ─────────────────────────────────────────────
export const goalsAPI = {
  list: () => api.get('/goals/'),
  create: (data) => api.post('/goals/', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
}

// ── Categories ────────────────────────────────────────
export const categoriesAPI = {
  list:   ()           => api.get('/categories/'),
  create: (data)       => api.post('/categories/', data),
  update: (id, data)   => api.put(`/categories/${id}`, data),
  delete: (id)         => api.delete(`/categories/${id}`),
}

// ── Cards ─────────────────────────────────────────────
export const cardsAPI = {
  list: () => api.get('/cards/'),
  create: (data) => api.post('/cards/', data),
  update: (id, data) => api.put(`/cards/${id}`, data),
  delete: (id) => api.delete(`/cards/${id}`),
}

export default api