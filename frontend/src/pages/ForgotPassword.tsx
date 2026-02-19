import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authApi.forgotPassword(email)
      setDone(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Falha ao solicitar redefinicao')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-gray-900/40 rounded-2xl p-6 border border-gray-800 space-y-4">
        <h1 className="text-xl font-bold text-white">Esqueci minha senha</h1>
        <p className="text-sm text-gray-400">Informe seu e-mail para receber o link de redefinicao.</p>

        {done ? (
          <div className="p-3 rounded-xl bg-emerald-500/10 text-sm text-emerald-300 border border-emerald-500/20">
            Se o e-mail existir, enviamos as instrucoes.
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 text-sm text-red-400 border border-red-500/20">
                {error}
              </div>
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
              placeholder="seu@email.com"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-medium rounded-xl transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
          </>
        )}

        <p className="text-sm text-gray-500 text-center">
          <Link to="/login" className="text-emerald-500 hover:underline">Voltar para login</Link>
        </p>
      </form>
    </div>
  )
}
