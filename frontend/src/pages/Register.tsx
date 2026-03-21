import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Trophy, ArrowLeft, UserCircle2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'
import FormField from '../components/FormField'
import { Input } from '../components/Input'
import type { UserRole } from '../types'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') ?? ''
  // Role comes from invite (most reliable) or from the URL param set by ChooseRole
  const fromRole = (searchParams.get('fromRole') as UserRole | null) ?? 'atleta'

  const { register, isAuthenticated, loading: authLoading } = useAuth()
  const [inviteRole, setInviteRole] = useState<UserRole | null>(null)
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const resolvedRole: UserRole = inviteRole ?? fromRole

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
        setInviteRole(res.data.role)
      } catch {
        setError('Convite inválido ou expirado.')
      }
    }
    loadInvite()
  }, [inviteToken])

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
      await register(form.email, form.telefone, form.senha, form.nome, inviteToken, resolvedRole)
      navigate('/', { replace: true })
    } catch {
      setError('Falha no cadastro. Verifique os dados.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col">
      <div className="pt-6 px-4">
        <Link to="/perfil" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
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

      <div className="flex-1 px-4 pb-8">
        <form
          onSubmit={handleSubmit}
          className="max-w-md mx-auto bg-gray-900/40 rounded-2xl p-6 border border-gray-800 space-y-4"
        >
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          {/* Tipo de conta (informativo) */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700">
            {resolvedRole === 'atleta' ? (
              <UserCircle2 size={20} className="text-blue-500 shrink-0" />
            ) : (
              <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
            )}
            <span className="text-white text-sm">
              {resolvedRole === 'atleta' ? 'Atleta' : 'Administrador'}
            </span>
            {!inviteToken && (
              <Link
                to="/perfil"
                className="ml-auto text-xs text-emerald-500 hover:underline"
              >
                Trocar
              </Link>
            )}
          </div>

          {resolvedRole === 'atleta' && !inviteToken && (
            <div className="p-3 rounded-xl bg-blue-500/10 text-sm text-blue-400 border border-blue-500/20">
              Você poderá entrar em um racha somente após receber um convite.
            </div>
          )}

          <FormField label="Nome">
            <Input name="nome" value={form.nome} onChange={handleChange} placeholder="Seu nome completo" />
          </FormField>
          <FormField label="E-mail">
            <Input type="email" name="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" />
          </FormField>
          <FormField label="Telefone">
            <Input name="telefone" value={form.telefone} onChange={handleChange} placeholder="(11) 99999-9999" />
          </FormField>
          <FormField label="Senha">
            <Input type="password" name="senha" value={form.senha} onChange={handleChange} placeholder="Crie uma senha" required />
          </FormField>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:text-gray-400 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? 'Criando...' : 'Criar conta'}
          </button>

          <p className="text-sm text-gray-500 text-center pt-2">
            Já tem conta?{' '}
            <Link
              className="text-emerald-500 font-medium hover:underline"
              to={inviteToken ? `/login?invite=${inviteToken}` : '/login'}
            >
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
