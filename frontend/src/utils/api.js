import axios from 'axios'
import { supabase } from './supabase'

const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
})

api.interceptors.request.use(async (config) => {
  // refreshSession() automatically refreshes if expired
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    // Force sign out if session is broken
    await supabase.auth.signOut()
    window.location.href = '/'
    return config
  }
  config.headers.Authorization = `Bearer ${session.access_token}`
  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut()
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export const getCards = () => api.get('/api/cards').then(r => r.data)
export const getStatements = (cardId) => api.get('/api/statements', { params: { card_id: cardId } }).then(r => r.data)
export const getTransactions = async (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.card_id)    params.set('card_id', filters.card_id)
  if (filters.year)       params.set('year', filters.year)
  if (filters.month)      params.set('month', filters.month)
  if (filters.category)   params.set('category', filters.category)
  if (filters.statement_id) params.set('statement_id', filters.statement_id)
  const res = await api.get(`/api/transactions?${params}`)
  return res.data
}
export const deleteStatement = (id) => api.delete(`/api/statements/${id}`)
export const uploadStatement = (file, cardId, onProgress) => {
  const fd = new FormData(); fd.append('file', file); fd.append('card_id', cardId)
  return api.post('/api/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round(e.loaded * 100 / e.total))
  }).then(r => r.data)
}
export const getAnalytics = (params) => api.get('/api/analytics', { params }).then(r => r.data)
// export const getTransactions = (params) => api.get('/api/transactions', { params }).then(r => r.data)
export const getYears = (cardIds) => api.get('/api/years', { params: { card_ids: cardIds } }).then(r => r.data)
export default api
export const CARD_COLORS = {
  amex_bce:  '#2E77D0',
  bofa_ccr:  '#E31837',
  chase_sapphire_preferred: '#1A1F71',
  amex_gold: '#C9A84C',
  default:   '#8888AA',
}
export const getCategoryColor = (category) => {
  const map = {
    'Dining':         '#FF6B6B',
    'Groceries':      '#4ECDC4',
    'Gas':            '#45B7D1',
    'Shopping':       '#96CEB4',
    'Travel':         '#FFEAA7',
    'Entertainment':  '#DDA0DD',
    'Healthcare':     '#98FB98',
    'Utilities':      '#F0E68C',
    'Online Shopping':'#87CEEB',
    'Supermarkets':   '#4ECDC4',
    'Other':          '#8888AA',
    'Uncategorized':  '#666688',
  }
  return map[category] || '#8888AA'
}