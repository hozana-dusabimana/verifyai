import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses — try to refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh`, { refresh });
          const { access, refresh: newRefresh } = res.data.data;
          localStorage.setItem('access_token', access);
          if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
          original.headers.Authorization = `Bearer ${access}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => {
    const refresh = localStorage.getItem('refresh_token');
    return api.post('/auth/logout', { refresh });
  },
  refresh: (refresh) => api.post('/auth/refresh', { refresh }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  googleOAuth: () => api.get('/auth/oauth/google'),
};

// ─── Users ────────────────────────────────────────────────────────────
export const usersAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  changePassword: (data) => api.put('/users/me/password', data),
  getAPIKeys: () => api.get('/users/me/apikeys'),
  createAPIKey: (name) => api.post('/users/me/apikeys/create', { name }),
  deleteAPIKey: (id) => api.delete(`/users/me/apikeys/${id}`),
  // Admin
  listUsers: (params) => api.get('/users', { params }),
  createUser: (data) => api.post('/users/create', data),
  updateUserRole: (userId, role) => api.put(`/users/${userId}/role`, { role }),
  deactivateUser: (userId) => api.delete(`/users/${userId}`),
};

// ─── Analysis ─────────────────────────────────────────────────────────
export const analysisAPI = {
  submit: (data) => {
    if (data instanceof FormData) {
      return api.post('/analysis/submit', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/analysis/submit', data);
  },
  getResult: (id) => api.get(`/analysis/${id}`),
  getStatus: (id) => api.get(`/analysis/${id}/status`),
  getExplanation: (id) => api.get(`/analysis/${id}/explain`),
  delete: (id) => api.delete(`/analysis/${id}`),
  flag: (id) => api.post(`/analysis/${id}/flag`),
  getHistory: (params) => api.get('/analysis/history', { params }),
  bulkSubmit: (articles) => api.post('/analysis/bulk', { articles }),
  exportPDF: (id) => api.get(`/analysis/${id}/export/pdf`, { responseType: 'blob' }),
  exportCSV: (id) => api.get(`/analysis/${id}/export/csv`, { responseType: 'blob' }),
};

// ─── News Feed ────────────────────────────────────────────────────────
export const newsfeedAPI = {
  submit: (data) => api.post('/newsfeed/posts', data),
  getFeed: (params) => api.get('/newsfeed/feed', { params }),
  getMyPosts: (params) => api.get('/newsfeed/posts/mine', { params }),
  getPost: (id) => api.get(`/newsfeed/posts/${id}`),
  delete: (id) => api.delete(`/newsfeed/posts/${id}`),
};

// ─── Alerts ───────────────────────────────────────────────────────────
export const alertsAPI = {
  list: (params) => api.get('/alerts', { params }),
  getDetail: (id) => api.get(`/alerts/${id}`),
  resolve: (id) => api.put(`/alerts/${id}/resolve`),
  escalate: (id) => api.put(`/alerts/${id}/escalate`),
  dismiss: (id) => api.delete(`/alerts/${id}/dismiss`),
  getSettings: () => api.get('/alerts/settings'),
  updateSettings: (data) => api.put('/alerts/settings', data),
};

// ─── Organization (Government + Admin) ───────────────────────────────
export const orgAPI = {
  listMembers: (params) => api.get('/org/members', { params }),
  createMember: (data) => api.post('/org/members/create', data),
  updateMemberRole: (userId, role) => api.put(`/org/members/${userId}/role`, { role }),
  deactivateMember: (userId) => api.delete(`/org/members/${userId}`),
};

// ─── Analytics ────────────────────────────────────────────────────────
export const analyticsAPI = {
  getSummary: (params) => api.get('/analytics/summary', { params }),
  getTrends: (params) => api.get('/analytics/trends', { params }),
  getSources: () => api.get('/analytics/sources'),
  getKeywords: () => api.get('/analytics/keywords'),
  getTopics: () => api.get('/analytics/topics'),
  getPlatformStats: () => api.get('/analytics/platform-stats'),
  // Org-scoped (Government / Admin)
  getOrgSummary: () => api.get('/analytics/org-summary'),
  getOrgFeed: () => api.get('/analytics/org-feed'),
  getOrgMembersPerformance: () => api.get('/analytics/org-members'),
  orgAlertAction: (alertId, action) => api.put(`/analytics/org-alert/${alertId}`, { action }),
  // Member-facing org overview (e.g. journalists)
  getMyOrg: () => api.get('/analytics/my-org'),
};

// ─── Admin ────────────────────────────────────────────────────────────
export const adminAPI = {
  getSystemHealth: () => api.get('/admin/system/health'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  uploadDataset: (formData) =>
    api.post('/admin/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getDatasets: () => api.get('/admin/datasets'),
  deleteDataset: (id) => api.delete(`/admin/datasets/${id}`),
  getAlertRules: () => api.get('/admin/alerts/rules'),
  updateAlertRules: (data) => api.put('/admin/alerts/rules', data),
  getMetrics: () => api.get('/admin/metrics'),
  // Statistics & organization oversight
  getStatistics: (params) => api.get('/admin/statistics', { params }),
  getOrganizations: () => api.get('/admin/organizations'),
  getOrganizationDetail: (name) => api.get('/admin/organizations/detail', { params: { name } }),
  getUserActivity: (userId) => api.get(`/admin/users/${userId}/activity`),
  // ML Engine
  getMLModels: () => api.get('/ml/models'),
  getMLHealth: () => api.get('/ml/health'),
  retrainModels: (datasetId) => api.post('/ml/retrain', { dataset_id: datasetId }),
  getTrainingJobs: () => api.get('/ml/training-jobs'),
  getTrainingJob: (jobId) => api.get(`/ml/training-jobs/${jobId}`),
  mlPredict: (text, title) => api.post('/ml/predict', { text, title }),
};

export default api;
