import axios, { type InternalAxiosRequestConfig } from 'axios'

/** Clés de stockage des tokens JWT (localStorage). */
export const TOKEN_KEY = 'presence_token'
export const REFRESH_KEY = 'presence_refresh'

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

function clearTokensAndRedirectToLogin() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

// Un seul rafraîchissement en vol à la fois : les requêtes qui échouent en 401
// pendant qu'il tourne attendent son résultat au lieu de déclencher chacune
// leur propre appel à /auth/refresh. `axios` (pas `api`) pour ne pas
// re-déclencher cet intercepteur en cas de 401 sur le refresh lui-même.
let refreshing: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const refresh = localStorage.getItem(REFRESH_KEY)
      if (!refresh) {
        throw new Error('Aucun token de rafraîchissement disponible.')
      }
      const { data } = await axios.post<{ access: string }>('/api/auth/refresh', { refresh })
      localStorage.setItem(TOKEN_KEY, data.access)
      return data.access
    })().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

// Sur un 401, tente un rafraîchissement du token puis rejoue la requête une
// seule fois ; si le refresh échoue (token de rafraîchissement absent/expiré),
// bascule sur la déconnexion complète comme avant.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetriableConfig | undefined
    const isLoginRequest = original?.url?.includes('/auth/login')

    if (error.response?.status === 401 && original && !original._retry && !isLoginRequest) {
      original._retry = true
      try {
        await refreshAccessToken()
        return api(original)
      } catch {
        clearTokensAndRedirectToLogin()
        return Promise.reject(error)
      }
    }

    if (error.response?.status === 401) {
      clearTokensAndRedirectToLogin()
    }
    return Promise.reject(error)
  },
)
