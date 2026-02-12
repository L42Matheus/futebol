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
  { test: /\/escalacao/, title: 'Escalação' },
]

export default function Layout({ children, title, showBack }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let active = true
    async function loadProfile() {
      if (!user || user.role !== 'atleta') {
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
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 md:pb-0 md:pl-64">
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex-col p-6 z-40">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">QJ</div>
          <span className="text-xl font-bold text-gray-900">QuemJoga</span>
        </div>

        <nav className="flex-1 space-y-2">
          {NAV_ITEMS.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null
            if (item.athleteOnly && user?.role !== 'atleta') return null
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  active ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all mt-auto"
        >
          <LogOut size={20} />
          Sair
        </button>
      </aside>

      <header className="md:hidden sticky top-0 bg-white border-b border-gray-100 z-30 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {resolvedShowBack && (
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500">
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-900 truncate">{resolvedTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Avatar
            src={profile?.foto_url}
            name={profile?.apelido || profile?.nome || user?.nome || user?.email || 'Perfil'}
            size="sm"
            className="border border-emerald-100"
          />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        {children || <Outlet />}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 h-16 flex items-center justify-between z-40">
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null
          if (item.athleteOnly && user?.role !== 'atleta') return null
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 ${
                active ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )}
        )}
      </nav>
    </div>
  )
}
