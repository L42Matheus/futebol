import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Trophy, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const [form, setForm] = useState({ identificador: '', senha: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redireciona se já está autenticado
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
      // Navegação feita pelo useEffect quando isAuthenticated muda
      // Forçar navegação direta após login bem-sucedido
      const redirectTo = (location.state as any)?.from?.pathname || '/'
      navigate(redirectTo, { replace: true })
    } catch (err: any) {
      setError('Falha no login. Verifique os dados.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
      {/* Header */}
      <div className="pt-6 px-4">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Voltar
        </Link>
      </div>

      <div className="pt-8 pb-6 px-6 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-lg">
          <Trophy size={28} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Entrar</h1>
        <p className="text-gray-500 mt-1">Use e-mail ou telefone</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 pb-8">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white rounded-2xl p-6 shadow-sm space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              E-mail ou Telefone
            </label>
            <input
              name="identificador"
              value={form.identificador}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Senha
            </label>
            <input
              type="password"
              name="senha"
              value={form.senha}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
              placeholder="Digite sua senha"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-sm text-gray-500 text-center pt-2">
            Não tem conta?{' '}
            <Link className="text-primary-600 font-medium hover:underline" to="/register">
              Cadastre-se
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
