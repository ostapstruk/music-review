import axios from 'axios';

// Базовий URL бекенду
const API_BASE = 'http://127.0.0.1:8000/api/v1';

// Створюємо екземпляр axios з базовими налаштуваннями
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
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

  getMe: () => api.get('/users/me'),
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

export default api;