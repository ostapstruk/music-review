import axios from 'axios';

// Базовий URL бекенду
const API_BASE = 'http://127.0.0.1:8000/api/v1';

// Створюємо екземпляр axios з базовими налаштуваннями
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

// Інтерцептор — автоматично додає JWT-токен до кожного запиту
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================================
// Auth
// ============================================================================

export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  register: (username, email, password) =>
    api.post('/users/', { username, email, password }),

  verifyEmail: (email, code) =>
    api.post('/auth/verify', { email, code }),

  resendCode: (email) =>
    api.post('/auth/resend-code', { email }),

  getMe: () => api.get('/users/me'),

  updateProfile: (data) => api.put('/users/me', data),

  getPublicProfile: (userId) => api.get('/users/' + userId + '/public'),

  getByUsername: (username) => api.get('/users/by-username/' + encodeURIComponent(username)),
};

// ============================================================================
// Tracks
// ============================================================================

export const tracksAPI = {
  getTrending: (limit = 10) =>
    api.get('/tracks/trending', { params: { limit } }),

  getAll: (limit = 20, offset = 0) =>
    api.get('/tracks/', { params: { limit, offset } }),

  getById: (id) => api.get(`/tracks/${id}`),

  create: (data) => api.post('/tracks/', data),

  searchSpotify: (query, limit = 10) =>
    api.get('/tracks/search/spotify', { params: { q: query, limit } }),

  addFromSpotify: (data) => api.post('/tracks/from-spotify', data),

  delete: (id) => api.delete(`/tracks/${id}`),

  /** Lazy refresh: викликається коли <audio> впав з помилкою (CDN-токен помер).
   *  Повертає {preview_url} — новий або старий, якщо знайти не вдалось. */
  refreshPreview: (id) => api.post(`/tracks/${id}/refresh-preview`),
};

// ============================================================================
// Reviews
// ============================================================================

export const reviewsAPI = {
  getForTrack: (trackId, limit = 20, offset = 0) =>
    api.get(`/reviews/track/${trackId}`, { params: { limit, offset } }),

  getForUser: (userId, limit = 20, offset = 0) =>
    api.get(`/reviews/user/${userId}`, { params: { limit, offset } }),

  create: (trackId, rating, text) =>
    api.post('/reviews/', { track_id: trackId, rating, text }),

  like: (reviewId) => api.post(`/reviews/like/${reviewId}`),
  dislike: (reviewId) => api.post(`/reviews/dislike/${reviewId}`),

  getDistribution: (trackId) => api.get(`/reviews/distribution/${trackId}`),
  
  delete: (reviewId) => api.delete(`/reviews/${reviewId}`),

  getMyVotes: (trackId) => api.get(`/reviews/my-votes/${trackId}`),

  getReplies: (reviewId) => api.get(`/reviews/${reviewId}/replies`),
  createReply: (reviewId, text) =>
    api.post(`/reviews/${reviewId}/replies`, { text }),
  deleteReply: (replyId) => api.delete(`/reviews/replies/${replyId}`),
};

// ============================================================================
// Genres & Badges
// ============================================================================

export const genresAPI = {
  getAll: () => api.get('/genres/'),
};

export const badgesAPI = {
  getAll: () => api.get('/badges/'),
};

// ============================================================================
// Activity Feed
// ============================================================================

export const activityAPI = {
  getRecent: (limit = 15) =>
    api.get('/activity/', { params: { limit } }),
};

// ============================================================================
// AI
// ============================================================================

export const aiAPI = {
  getSummary: (trackId) => api.get(`/ai/summary/${trackId}`),
};

// ============================================================================
// Stats
// ============================================================================

export const statsAPI = {
  get: () => api.get('/stats/'),
  getMyLikes: () => api.get('/stats/my-likes'),
};

// ============================================================================
// Artists
// ============================================================================

export const artistsAPI = {
  getById: (id) => api.get(`/artists/${id}`),
  getMe: () => api.get('/artists/me'),
  syncMyTracks: () => api.post('/artists/me/sync-tracks'),
  claim: (artistId, message) =>
    api.post('/artists/claim', { artist_id: artistId, message }),
};

// ============================================================================
// Notifications
// ============================================================================

export const notificationsAPI = {
  list: (limit = 50, offset = 0) =>
    api.get('/notifications/', { params: { limit, offset } }),
  unreadCount: () => api.get('/notifications/unread-count'),
  // Викликається при відкритті сторінки — клінає бейдж на дзвонику.
  markAllSeen: () => api.post('/notifications/mark-all-seen'),
  // Викликається при кліку на конкретний айтем — прибирає виділення.
  markRead: (id) => api.post(`/notifications/${id}/mark-read`),
};

// ============================================================================
// Admin
// ============================================================================

export const adminAPI = {
  listClaims: (statusFilter) =>
    api.get('/admin/claims', { params: statusFilter ? { status: statusFilter } : {} }),
  approveClaim: (claimId) => api.post(`/admin/claims/${claimId}/approve`),
  rejectClaim: (claimId) => api.post(`/admin/claims/${claimId}/reject`),
  changeUserRole: (userId, role) =>
    api.patch(`/admin/users/${userId}/role`, { role }),

  listTrackSubmissions: (statusFilter) =>
    api.get('/admin/track-submissions', { params: statusFilter ? { status: statusFilter } : {} }),
  approveTrack: (trackId) => api.post(`/admin/track-submissions/${trackId}/approve`),
  rejectTrack: (trackId) => api.post(`/admin/track-submissions/${trackId}/reject`),
};

export default api;