import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { REFRESH_KEY, TOKEN_KEY } from '../api/client'

interface AuthContextValue {
  token: string | null
  isAuthenticated: boolean
  login: (access: string, refresh: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Fournit l'état d'authentification global (tokens JWT en localStorage).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login: (access: string, refresh: string) => {
        localStorage.setItem(TOKEN_KEY, access)
        localStorage.setItem(REFRESH_KEY, refresh)
        setToken(access)
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_KEY)
        setToken(null)
      },
    }),
    [token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans un <AuthProvider>')
  }
  return ctx
}
