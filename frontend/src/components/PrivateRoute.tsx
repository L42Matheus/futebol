import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Protects routes that require authentication.
 * Business-logic redirects (e.g., athlete without racha) belong in the
 * specific page components, not here.
 */
export default function PrivateRoute() {
  const location = useLocation()
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/perfil" state={{ from: location }} replace />
  }

  return <Outlet />
}
