import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

/**
 * Garde de route : redirige vers /login si l'utilisateur n'est pas authentifié.
 * Protège toutes les routes du tableau de bord (cf. AUTH-01).
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
