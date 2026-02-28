import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('alluz_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('alluz_token');
      if (window.location.pathname.startsWith('/admin/dashboard')) {
        window.location.href = '/admin';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  changePassword: (username, password) => api.post('/auth/change-password', { username, password }),
};

export const contentApi = {
  getAll: () => api.get('/content'),
  update: (key, value) => api.put('/admin/content', { key, value }),
  updateWhatsApp: (numero, mensagem_template) => api.put('/admin/whatsapp', { numero, mensagem_template }),
};

export const plansApi = {
  getAll: () => api.get('/plans'),
  create: (plan) => api.post('/admin/plans', plan),
  update: (id, plan) => api.put(`/admin/plans/${id}`, plan),
  delete: (id) => api.delete(`/admin/plans/${id}`),
};

export const leadsApi = {
  create: (lead) => api.post('/leads', lead),
  getAll: (params) => api.get('/admin/leads', { params }),
  updateStatus: (id, status) => api.patch(`/admin/leads/${id}`, { status }),
  exportCsv: () => api.get('/admin/leads/export'),
};

export default api;
