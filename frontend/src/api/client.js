import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (email, password) => 
    api.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }),
  register: (email, password) => 
    api.post('/auth/register', { email, password }),
  getMe: () => 
    api.get('/auth/me'),
}

// Candidates API
export const candidatesAPI = {
  getAll: (params) => 
    api.get('/candidates/', { params }),
  getOne: (id) => 
    api.get(`/candidates/${id}`),
  create: (data) => 
    api.post('/candidates/', data),
  update: (id, data) => 
    api.patch(`/candidates/${id}`, data),
  delete: (id) => 
    api.delete(`/candidates/${id}`),
  submitScore: (id, data) => 
    api.post(`/candidates/${id}/scores`, data),
  generateSummary: (id) => 
    api.post(`/candidates/${id}/summary`),
}

export default api
