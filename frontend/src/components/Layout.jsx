import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext' // Import useAuth

export default function Layout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold">QuemJoga</span>
          </Link>
          <div className="flex items-center">
            {isAuthenticated ? (
              <button onClick={handleLogout} className="btn-secondary text-white hover:bg-primary-700 ml-4">
                Sair
              </button>
            ) : null}
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <p className="text-primary-100 text-sm mt-1">Organize seu racha sem estresse</p>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
