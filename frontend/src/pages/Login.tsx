import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Trophy, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') || ''
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const [form, setForm] = useState({ identificador: '', senha: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const redirectTo = (location.state as any)?.from?.pathname || '/'
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, authLoading, navigate, location.state])

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
        } catch (e) {}
      }
      const redirectTo = (location.state as any)?.from?.pathname || '/'
      navigate(redirectTo, { replace: true })
    } catch (err: any) {
      setError('Falha no login. Verifique os dados.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col">
      {/* Header */}
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

      {/* Form */}
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:text-gray-400 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-sm text-gray-500 text-center pt-2">
            Não tem conta?{' '}
            <Link className="text-emerald-500 font-medium hover:underline" to={inviteToken ? `/register?invite=${inviteToken}` : '/register'}>
              Cadastre-se
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
