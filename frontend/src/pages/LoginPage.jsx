import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi, setAuthToken } from '../services/api'
import authService from '../services/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ identificador: '', senha: '' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      handleGoogleCallback(code)
    }
  }, [searchParams])

  async function handleGoogleCallback(code) {
    setGoogleLoading(true)
    try {
      const redirectUri = `${window.location.origin}/login`
      const inviteToken = localStorage.getItem('pending_invite_token')
      await authService.loginWithGoogle(code, redirectUri, inviteToken)
      localStorage.removeItem('pending_invite_token')
      const redirectTo = localStorage.getItem('login_redirect') || '/'
      localStorage.removeItem('login_redirect')
      navigate(redirectTo)
    } catch (error) {
      console.error('Erro no login com Google:', error)
      alert('Falha no login com Google. Tente novamente.')
      navigate('/login', { replace: true })
    } finally {
      setGoogleLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await authApi.login(form)
      localStorage.setItem('auth_token', response.data.access_token)
      setAuthToken(response.data.access_token)
      const redirectTo = location.state?.from?.pathname || '/'
      navigate(redirectTo)
    } catch (error) {
      console.error('Erro ao entrar:', error)
      alert('Falha no login. Verifique os dados.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    try {
      if (location.state?.from?.pathname) {
        localStorage.setItem('login_redirect', location.state.from.pathname)
      }
      const redirectUri = `${window.location.origin}/login`
      const url = await authService.getGoogleAuthUrl(redirectUri)
      window.location.href = url
    } catch (error) {
      console.error('Erro ao iniciar login com Google:', error)
      alert('Login com Google não disponível no momento.')
      setGoogleLoading(false)
    }
  }

  if (googleLoading) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="card p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Conectando com Google...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Entrar</h1>
        <p className="text-gray-500">Use e-mail ou telefone</p>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">E-mail ou Telefone</label>
          <input name="identificador" value={form.identificador} onChange={handleChange} className="input" required />
        </div>
        <div>
          <label className="label">Senha</label>
          <input type="password" name="senha" value={form.senha} onChange={handleChange} className="input" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">ou</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors"
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

        <p className="text-sm text-gray-500 text-center">
          Não tem conta? <Link className="text-primary-600" to="/register">Cadastre-se</Link>
        </p>
      </form>
    </div>
  )
}
