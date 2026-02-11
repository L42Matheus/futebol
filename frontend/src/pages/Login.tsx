import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi, setAuthToken } from '../services/api'
import { useAccountType } from '../context/AccountTypeContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accountType } = useAccountType()
  const [form, setForm] = useState({ identificador: '', senha: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await authApi.login(form)
      localStorage.setItem('auth_token', response.data.access_token)
      setAuthToken(response.data.access_token)
      const redirectTo = (location.state as any)?.from?.pathname || '/'
      navigate(redirectTo)
    } catch (err: any) {
      setError('Falha no login. Verifique os dados.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Entrar</h1>
        <p className="text-gray-500">Use e-mail ou telefone</p>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
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
        <p className="text-sm text-gray-500 text-center">
          Não tem conta? <Link className="text-primary-600" to="/register">Cadastre-se</Link>
        </p>
        {!accountType && (
          <p className="text-xs text-gray-500 text-center">
            <Link to="/perfil" className="text-primary-600">Voltar e escolher perfil</Link>
          </p>
        )}
      </form>
    </div>
  )
}
