import { useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!token) {
      setError('Token invalido')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas nao conferem')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(token, newPassword)
      setMessage('Senha redefinida com sucesso. Redirecionando para login...')
      setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Falha ao redefinir senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-gray-900/40 rounded-2xl p-6 border border-gray-800 space-y-4">
        <h1 className="text-xl font-bold text-white">Redefinir senha</h1>
        <p className="text-sm text-gray-400">Crie uma nova senha para sua conta.</p>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 text-sm text-red-400 border border-red-500/20">
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 rounded-xl bg-emerald-500/10 text-sm text-emerald-300 border border-emerald-500/20">
            {message}
          </div>
        )}

        <input
          type="password"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
          placeholder="Nova senha"
        />
        <input
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
          placeholder="Confirmar nova senha"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-medium rounded-xl transition-colors"
        >
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </button>

        <p className="text-sm text-gray-500 text-center">
          <Link to="/login" className="text-emerald-500 hover:underline">Voltar para login</Link>
        </p>
      </form>
    </div>
  )
}
