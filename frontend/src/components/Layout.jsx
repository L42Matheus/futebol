import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { LogOut, ChevronLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { NAV_ITEMS } from '../constants'
import Avatar from './Avatar'
import { profileApi } from '../services/api'

const TITLES = [
  { test: /^\/$/, title: 'QuemJoga' },
  { test: /^\/novo$/, title: 'Novo Racha' },
  { test: /\/racha\/\d+$/, title: 'Racha' },
  { test: /\/atletas/, title: 'Atletas' },
  { test: /\/jogos/, title: 'Jogos' },
  { test: /\/novo-jogo/, title: 'Novo Jogo' },
  { test: /\/financeiro/, title: 'Financeiro' },
  { test: /\/times/, title: 'Times' },
  { test: /\/escalacao/, title: 'Escalacao' },
]

export default function Layout({ children, title, showBack }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let active = true
    async function loadProfile() {
      if (!user) {
        setProfile(null)
        return
      }
      try {
        const res = await profileApi.me()
        if (active) setProfile(res.data)
      } catch (error) {
        if (active) setProfile(null)
      }
    }
    loadProfile()
    return () => { active = false }
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/perfil')
  }

  const resolvedTitle = title || (TITLES.find((t) => t.test.test(location.pathname))?.title || 'QuemJoga')
  const resolvedShowBack = typeof showBack === 'boolean' ? showBack : location.pathname !== '/'

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f1a] pb-24 md:pb-0 md:pl-72">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-72 bg-[#0b0f1a] border-r border-gray-800 flex-col p-6 z-40">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">QJ</div>
          <span className="text-xl font-bold text-white">QuemJoga</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null
            if (item.athleteOnly && user?.role !== 'atleta') return null
            if (item.isFab) return null
            const active = location.pathname === item.path
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
        </nav>

        <div className="space-y-1 pt-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            Sair
          </button>
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
            src={profile?.foto_url}
            name={profile?.apelido || profile?.nome || user?.nome || user?.email || 'Perfil'}
            size="sm"
            className="border border-gray-700"
          />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        {children || <Outlet />}
      </main>

      {/* Bottom Navigation Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0b0f1a]/95 backdrop-blur-xl border-t border-gray-800 px-8 h-20 flex items-center justify-between z-50">
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null
          if (item.athleteOnly && user?.role !== 'atleta') return null
          const active = location.pathname === item.path

          if (item.isFab) {
            return (
              <div key={item.path} className="relative -top-6">
                <Link
                  to={item.path}
                  className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-900/40 border-4 border-[#0b0f1a] active:scale-95 transition-transform"
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
    </div>
  )
}
