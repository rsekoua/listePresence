import axios from 'axios'

/** Clé de stockage du token JWT (localStorage). */
export const TOKEN_KEY = 'presence_token'

/**
 * Client Axios partagé.
 * baseURL '/api' est relayé vers le backend Django via le proxy Vite (dev)
 * ou via Nginx (production).
 */
export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Ajoute automatiquement le token JWT aux requêtes si présent.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirige vers la connexion si le token est expiré/invalide (Sprint 2).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)
