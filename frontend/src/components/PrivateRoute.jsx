import { Navigate, Outlet, useLocation } from 'react-router-dom'

function hasToken() {
  return Boolean(localStorage.getItem('auth_token'))
}

export default function PrivateRoute() {
  const location = useLocation()
  if (!hasToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Outlet />
}
