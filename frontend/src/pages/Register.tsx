import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi, setAuthToken } from '../services/api'
import { useAccountType, AccountType } from '../context/AccountTypeContext'

function toRole(value: AccountType | null) {
  if (value === 'ADMIN') return 'admin'
  return 'atleta'
}

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') || ''
  const { accountType, setAccountType } = useAccountType()

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const role = useMemo(() => toRole(accountType), [accountType])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.email && !form.telefone) {
      setError('Informe e-mail ou telefone.')
      return
    }
    if (accountType === 'ATLETA' && !inviteToken) {
      setError('Atleta precisa de convite.')
      return
    }
    setLoading(true)
    try {
      const payload: any = { ...form, role }
      if (inviteToken) payload.invite_token = inviteToken
      const response = await authApi.register(payload)
      localStorage.setItem('auth_token', response.data.access_token)
      setAuthToken(response.data.access_token)
      navigate('/')
    } catch (err: any) {
      setError('Falha no cadastro. Verifique os dados.')
    } finally {
      setLoading(false)
    }
  }

  function handleSwapRole() {
    setAccountType(null)
    navigate('/perfil')
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Criar conta</h1>
        <p className="text-gray-500">E-mail ou telefone obrigatório</p>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="label">Tipo de conta</label>
          {accountType ? (
            <div className="flex items-center justify-between gap-3">
              <div className="input bg-gray-50">
                {accountType === 'ATLETA' ? 'Atleta' : 'Administrador'}
              </div>
              <button type="button" className="btn-secondary" onClick={handleSwapRole}>
                Trocar
              </button>
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              Nenhum perfil selecionado. <Link className="text-primary-600" to="/perfil">Voltar e escolher perfil</Link>
            </div>
          )}
        </div>
        <div>
          <label className="label">Nome</label>
          <input name="nome" value={form.nome} onChange={handleChange} className="input" />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} className="input" />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input name="telefone" value={form.telefone} onChange={handleChange} className="input" />
        </div>
        <div>
          <label className="label">Senha</label>
          <input type="password" name="senha" value={form.senha} onChange={handleChange} className="input" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Criando...' : 'Criar conta'}
        </button>
        <p className="text-sm text-gray-500 text-center">
          Já tem conta? <Link className="text-primary-600" to="/login">Entrar</Link>
        </p>
      </form>
    </div>
  )
}
