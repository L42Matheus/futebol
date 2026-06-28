import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { LogOut, ChevronLeft, Settings, Calendar, Users, Layers, DollarSign, LayoutGrid, CreditCard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { NAV_ITEMS } from '../constants'
import Avatar from './Avatar'
import { profileApi } from '../services/api'

const TITLES: Array<{ test: RegExp; title: string }> = [
  { test: /^\/app$/, title: 'QuemJogaFC' },
  { test: /^\/novo$/, title: 'Novo Racha' },
  { test: /\/racha\/\d+$/, title: 'Racha' },
  { test: /\/atletas/, title: 'Atletas' },
  { test: /\/jogos/, title: 'Jogos' },
  { test: /\/novo-jogo/, title: 'Novo Jogo' },
  { test: /\/financeiro/, title: 'Financeiro' },
  { test: /\/times/, title: 'Times' },
  { test: /\/escalacao/, title: 'Escalação' },
]

interface LayoutProps {
  children?: ReactNode
  title?: string
  showBack?: boolean
}

export default function Layout({ children, title, showBack }: LayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/perfil')
  }

  const resolvedTitle =
    title ?? (TITLES.find((t) => t.test.test(location.pathname))?.title ?? 'QuemJogaFC')
  const resolvedShowBack =
    typeof showBack === 'boolean' ? showBack : location.pathname !== '/app'

  const avatarName = user?.nome ?? user?.email ?? 'Perfil'

  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!user) {
      setAvatarSrc(null)
      return
    }
    let cancelled = false
    profileApi
      .me()
      .then(({ data }) => {
        if (!cancelled) setAvatarSrc(data.foto_url ?? null)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Extrair rachaId da URL para nav contextual
  const rachaMatch = location.pathname.match(/\/racha\/(\d+)/)
  const rachaId = rachaMatch ? rachaMatch[1] : null
  const isFinanceiroRoute = location.pathname === '/financeiro' || /\/racha\/\d+\/financeiro$/.test(location.pathname)
  const isJogosRoute = location.pathname === '/jogos' || /\/racha\/\d+\/(jogos|novo-jogo|jogo\/\d+)/.test(location.pathname)
  const showRachaNav = Boolean(rachaId) && !isFinanceiroRoute

  const RACHA_NAV_ITEMS = rachaId ? [
    { path: `/racha/${rachaId}/jogos`, label: 'Jogos', icon: <Calendar size={18} /> },
    { path: `/racha/${rachaId}/atletas`, label: 'Atletas', icon: <Users size={18} /> },
    { path: `/racha/${rachaId}/times`, label: 'Times', icon: <Layers size={18} /> },
    { path: `/racha/${rachaId}/escalacao`, label: 'Escalação', icon: <LayoutGrid size={18} /> },
    { path: `/racha/${rachaId}/financeiro`, label: 'Financeiro', icon: <DollarSign size={18} /> },
  ] : []

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f1a] pb-24 md:pb-0 md:pl-64">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-[#0b0f1a] border-r border-gray-800 flex-col p-5 z-40">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
            QJ
          </div>
          <span className="text-xl font-bold text-white">QuemJogaFC</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter(item => !item.isFab).map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null
            if (item.athleteOnly && user?.role !== 'atleta') return null
            const active =
              location.pathname === item.path ||
              (item.path === '/financeiro' && isFinanceiroRoute) ||
              (item.path === '/jogos' && isJogosRoute)

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-500 font-semibold'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}

          {/* Nav contextual do racha */}
          {showRachaNav && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <p className="px-4 mb-2 text-[10px] uppercase font-black text-gray-600 tracking-widest">Este Racha</p>
              {RACHA_NAV_ITEMS.map((item) => {
                const active = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
                      active
                        ? 'bg-emerald-500/10 text-emerald-500 font-semibold'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Botão Criar Racha - apenas para admins */}
          {user?.role === 'admin' && (
            <Link
              to="/novo"
              className="flex items-center gap-3 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors mt-4"
            >
              {NAV_ITEMS.find(item => item.isFab)?.icon}
              Criar Racha
            </Link>
          )}

          {/* Assinatura - apenas para admins */}
          {user?.role === 'admin' && (
            <Link
              to="/assinatura"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mt-2 ${
                location.pathname === '/assinatura'
                  ? 'bg-emerald-500/10 text-emerald-500 font-semibold'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <CreditCard size={18} />
              Assinatura
            </Link>
          )}
        </nav>

        {/* Usuário logado */}
        <div className="pt-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-2 py-3">
            <Avatar
              src={avatarSrc}
              name={avatarName}
              size="md"
              className="border-2 border-gray-700"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.nome || 'Usuário'}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Atleta'}</p>
            </div>
          </div>
          <div className="flex gap-1 mt-2">
            <Link
              to="/perfil-atleta"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings size={14} />
              Perfil
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Header Mobile */}
      <header className="md:hidden sticky top-0 bg-[#0b0f1a]/80 backdrop-blur-md border-b border-gray-800 z-30 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          {resolvedShowBack && (
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400">
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-lg font-bold text-white truncate">{resolvedTitle}</h1>
        </div>
        <Link to="/perfil-atleta">
          <Avatar
            src={avatarSrc}
            name={avatarName}
            size="sm"
            className="border border-gray-700"
          />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        {children ?? <Outlet />}
      </main>

      {/* Bottom Navigation Mobile */}
      {(() => {
        const isAdmin = user?.role === 'admin'
        const filteredItems = NAV_ITEMS.filter(item => {
          if (item.adminOnly && !isAdmin) return false
          if (item.athleteOnly && user?.role !== 'atleta') return false
          if (item.isFab && !isAdmin) return false
          return true
        })

        return (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0b0f1a]/95 backdrop-blur-xl border-t border-gray-800 px-6 h-20 flex items-center justify-around z-50">
            {filteredItems.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path === '/financeiro' && isFinanceiroRoute) ||
                (item.path === '/jogos' && isJogosRoute)

              if (item.isFab) {
                return (
                  <div key={item.path} className="relative -top-6">
                    <Link
                      to={item.path}
                      className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-900/40 border-4 border-[#0b0f1a] active:scale-95 transition-transform"
                    >
                      {item.icon}
                    </Link>
                  </div>
                )
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    active ? 'text-emerald-500' : 'text-gray-500'
                  }`}
                >
                  {item.icon}
                  <span className="text-[10px] font-bold">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        )
      })()}
    </div>
  )
}
