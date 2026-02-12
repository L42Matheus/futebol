import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, LogOut, User, Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { isAuthenticated, logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/perfil')
  }

  // Verifica se está na home (não mostra botão voltar)
  const isHome = location.pathname === '/'

  // Determina o título baseado na rota
  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/') return null
    if (path === '/novo') return 'Novo Racha'
    if (path.includes('/atletas')) return 'Atletas'
    if (path.includes('/times')) return 'Times'
    if (path.includes('/financeiro')) return 'Financeiro'
    if (path.includes('/jogos')) return 'Jogos'
    if (path.includes('/jogo/')) return 'Detalhes do Jogo'
    if (path.includes('/novo-jogo')) return 'Novo Jogo'
    if (path.match(/\/racha\/\d+$/)) return 'Racha'
    return null
  }

  const pageTitle = getPageTitle()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header principal - só aparece na Home */}
      {isHome && (
        <header className="bg-primary-600 text-white shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Trophy size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold">QuemJoga</h1>
                  <p className="text-primary-100 text-xs">Organize seu racha</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user && (
                  <div className="hidden sm:flex items-center gap-2 text-sm text-primary-100 mr-2">
                    <User size={16} />
                    <span>{user.nome || user.email}</span>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Header de navegação - aparece nas páginas internas */}
      {!isHome && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-600" />
                </button>
                {pageTitle && (
                  <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
                )}
              </div>
              <Link
                to="/"
                className="text-primary-600 font-medium text-sm hover:underline"
              >
                Início
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
