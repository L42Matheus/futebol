import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Verifica se há token no localStorage (fallback para race conditions)
function hasValidToken() {
  return Boolean(localStorage.getItem('auth_token') && localStorage.getItem('session_id'))
}

export default function PrivateRoute() {
  const location = useLocation()
  const { isAuthenticated, loading } = useAuth()

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Verifica tanto o estado do contexto quanto o localStorage
  if (!isAuthenticated && !hasValidToken()) {
    return <Navigate to="/perfil" state={{ from: location }} replace />
  }

  return <Outlet />
}
