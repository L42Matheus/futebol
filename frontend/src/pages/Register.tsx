import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Trophy, ArrowLeft, UserCircle2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'
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
  const { register, isAuthenticated, loading: authLoading } = useAuth()
  const [inviteRole, setInviteRole] = useState<'admin' | 'atleta' | null>(null)

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const role = useMemo(() => toRole(accountType), [accountType])

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, authLoading, navigate])

  useEffect(() => {
    if (!inviteToken) return
    async function loadInvite() {
      try {
        const res = await authApi.getInvite(inviteToken)
        const roleFromInvite = res.data.role === 'admin' ? 'admin' : 'atleta'
        setInviteRole(roleFromInvite)
        setAccountType(roleFromInvite === 'admin' ? 'ADMIN' : 'ATLETA')
      } catch (e) {
        setError('Convite inválido ou expirado.')
      }
    }
    loadInvite()
  }, [inviteToken, setAccountType])

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
    setLoading(true)
    try {
      const finalRole = inviteRole || role
      await register(form.email, form.telefone, form.senha, form.nome, inviteToken, finalRole)
      navigate('/', { replace: true })
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

  const inputClass = "w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"

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
        <h1 className="text-2xl font-bold text-white">Criar conta</h1>
        <p className="text-gray-400 mt-1">Preencha seus dados</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 pb-8">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-gray-900/40 rounded-2xl p-6 border border-gray-800 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          {/* Tipo de conta */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Tipo de conta
            </label>
            {accountType ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700">
                  {accountType === 'ATLETA' ? (
                    <UserCircle2 size={20} className="text-blue-500" />
                  ) : (
                    <ShieldCheck size={20} className="text-emerald-500" />
                  )}
                  <span className="text-white">
                    {accountType === 'ATLETA' ? 'Atleta' : 'Administrador'}
                  </span>
                </div>
                {!inviteToken && (
                  <button
                    type="button"
                    onClick={handleSwapRole}
                    className="px-4 py-3 text-sm font-medium text-emerald-500 hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    Trocar
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-yellow-500/10 text-sm text-yellow-500 border border-yellow-500/20">
                Nenhum perfil selecionado.{' '}
                <Link className="font-medium underline" to="/perfil">
                  Escolher perfil
                </Link>
              </div>
            )}
          </div>
          {accountType === 'ATLETA' && !inviteToken && (
            <div className="p-3 rounded-xl bg-blue-500/10 text-sm text-blue-400 border border-blue-500/20">
              Você poderá entrar em um racha somente após receber um convite.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Nome
            </label>
            <input
              name="nome"
              value={form.nome}
              onChange={handleChange}
              className={inputClass}
              placeholder="Seu nome completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className={inputClass}
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Telefone
            </label>
            <input
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              className={inputClass}
              placeholder="(11) 99999-9999"
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
              className={inputClass}
              placeholder="Crie uma senha"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:text-gray-400 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? 'Criando...' : 'Criar conta'}
          </button>

          <p className="text-sm text-gray-500 text-center pt-2">
            Já tem conta?{' '}
            <Link className="text-emerald-500 font-medium hover:underline" to={inviteToken ? `/login?invite=${inviteToken}` : '/login'}>
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
