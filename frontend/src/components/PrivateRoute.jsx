import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { rachasApi } from '../services/api'
import NoRacha from '../pages/NoRacha'

// Verifica se há token no localStorage (fallback para race conditions)
function hasValidToken() {
  return Boolean(localStorage.getItem('auth_token') && localStorage.getItem('session_id'))
}

export default function PrivateRoute() {
  const location = useLocation()
  const { isAuthenticated, loading, user } = useAuth()
  const [checkedRachas, setCheckedRachas] = useState(false)
  const [hasRacha, setHasRacha] = useState(true)

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

  useEffect(() => {
    async function checkRachas() {
      if (!user) return
      if (user.role !== 'atleta') {
        setHasRacha(true)
        setCheckedRachas(true)
        return
      }
      try {
        const res = await rachasApi.list()
        setHasRacha(res.data.length > 0)
      } catch {
        setHasRacha(false)
      } finally {
        setCheckedRachas(true)
      }
    }
    checkRachas()
  }, [user])

  if (!checkedRachas) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (user?.role === 'atleta' && !hasRacha) {
    if (location.pathname !== '/perfil-basico') {
      return <Navigate to="/perfil-basico" replace />
    }
    return <NoRacha />
  }

  return <Outlet />
}
