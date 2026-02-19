import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Trophy, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'
import authService from '../services/auth'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') || ''
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const [form, setForm] = useState({ identificador: '', senha: '' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const redirectTo = (location.state as any)?.from?.pathname || '/'
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, authLoading, navigate, location.state])

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      void handleGoogleCallback(code)
    }
  }, [searchParams])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.identificador, form.senha)
      if (inviteToken) {
        try {
          await authApi.acceptInvite(inviteToken)
        } catch (e) {
          // Ignore invite accept errors after login.
        }
      }
      const redirectTo = (location.state as any)?.from?.pathname || '/'
      navigate(redirectTo, { replace: true })
    } catch (err: any) {
      setError('Falha no login. Verifique os dados.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleCallback(code: string) {
    setError('')
    setGoogleLoading(true)
    try {
      const redirectUri = `${window.location.origin}/login`
      const pendingInvite = localStorage.getItem('pending_invite_token')
      await authService.loginWithGoogle(code, redirectUri, pendingInvite || undefined)
      localStorage.removeItem('pending_invite_token')

      const redirectTo =
        localStorage.getItem('login_redirect') ||
        (location.state as any)?.from?.pathname ||
        '/'
      localStorage.removeItem('login_redirect')

      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError('Falha no login com Google. Tente novamente.')
      navigate('/login', { replace: true })
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setGoogleLoading(true)
    try {
      if (inviteToken) {
        localStorage.setItem('pending_invite_token', inviteToken)
      }
      if ((location.state as any)?.from?.pathname) {
        localStorage.setItem('login_redirect', (location.state as any).from.pathname)
      }

      const redirectUri = `${window.location.origin}/login`
      const url = await authService.getGoogleAuthUrl(redirectUri)
      window.location.href = url
    } catch (err) {
      setError('Login com Google nao disponivel no momento.')
      setGoogleLoading(false)
    }
  }

  if (googleLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-900/40 rounded-2xl p-8 border border-gray-800 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Conectando com Google...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col">
      <div className="pt-6 px-4">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft size={18} />
          Voltar
        </Link>
      </div>

      <div className="pt-8 pb-6 px-6 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg">
          <Trophy size={28} />
        </div>
        <h1 className="text-2xl font-bold text-white">Entrar</h1>
        <p className="text-gray-400 mt-1">Use e-mail ou telefone</p>
      </div>

      <div className="flex-1 px-4 pb-8">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-gray-900/40 rounded-2xl p-6 border border-gray-800 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              E-mail ou Telefone
            </label>
            <input
              name="identificador"
              value={form.identificador}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Senha
            </label>
            <input
              type="password"
              name="senha"
              value={form.senha}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
              placeholder="Digite sua senha"
              required
            />
            <div className="mt-2 text-right">
              <Link to="/esqueci-senha" className="text-xs text-emerald-500 hover:underline">
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:text-gray-400 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#101723] text-gray-500">ou</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-700 rounded-xl bg-gray-800/30 text-gray-100 hover:bg-gray-800/60 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Entrar com Google
          </button>

          <p className="text-sm text-gray-500 text-center pt-2">
            Nao tem conta?{' '}
            <Link className="text-emerald-500 font-medium hover:underline" to={inviteToken ? `/register?invite=${inviteToken}` : '/register'}>
              Cadastre-se
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
