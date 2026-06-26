import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Copy, Users, ClipboardList, ArrowRight, Dribbble, CalendarDays } from 'lucide-react'
import { rachasApi, authApi, temporadasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import FormField from '../components/FormField'
import { Input, Select } from '../components/Input'
import type { TipoRacha } from '../types'

const SELECTED_RACHA_KEY = 'quemjogafc:selected_racha_id'

interface RachaForm {
  nome: string
  tipo: TipoRacha
  escalacao_size: number
  valor_mensalidade: number
  valor_cartao_amarelo: number
  valor_cartao_vermelho: number
  criar_temporada: boolean
  temporada_nome: string
  temporada_mes: number
  temporada_ano: number
}

const SOCIETY_SIZE_OPTIONS = [5, 6, 7, 8] as const
const DEFAULT_SIZE_BY_TIPO: Record<TipoRacha, number> = {
  campo: 11,
  society: 7,
  futsal: 5,
}

interface InviteLinks {
  atleta: string
  admin: string
}

export default function NovoRacha() {
  const navigate = useNavigate()
  const now = new Date()
  const [loading, setLoading] = useState(false)
  const [inviteLinks, setInviteLinks] = useState<InviteLinks | null>(null)
  const [createdRachaId, setCreatedRachaId] = useState<number | null>(null)
  const [form, setForm] = useState<RachaForm>({
    nome: '',
    tipo: 'society',
    escalacao_size: DEFAULT_SIZE_BY_TIPO.society,
    valor_mensalidade: 0,
    valor_cartao_amarelo: 1000,
    valor_cartao_vermelho: 2000,
    criar_temporada: true,
    temporada_nome: `Temporada ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
    temporada_mes: now.getMonth() + 1,
    temporada_ano: now.getFullYear(),
  })
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const {
        criar_temporada,
        temporada_nome,
        temporada_mes,
        temporada_ano,
        ...rachaPayload
      } = form
      const response = await rachasApi.create(rachaPayload)
      setCreatedRachaId(response.data.id)
      localStorage.setItem(SELECTED_RACHA_KEY, String(response.data.id))

      if (criar_temporada) {
        await temporadasApi.create({
          racha_id: response.data.id,
          nome: temporada_nome,
          mes: temporada_mes,
          ano: temporada_ano,
          status: 'ativa',
        })
      }

      try {
        const [inviteAtleta, inviteAdmin] = await Promise.all([
          authApi.createInvite({ racha_id: response.data.id, role: 'atleta' }),
          authApi.createInvite({ racha_id: response.data.id, role: 'admin' }),
        ])
        const base = window.location.origin
        setInviteLinks({
          atleta: `${base}/register?invite=${inviteAtleta.data.token}`,
          admin: `${base}/register?invite=${inviteAdmin.data.token}`,
        })
      } catch (inviteError) {
        console.error('Racha criado, mas os convites falharam:', inviteError)
        toast('Racha criado. A geração de convites será ajustada na próxima etapa.', 'success')
        navigate(`/racha/${response.data.id}`)
      }
    } catch (error) {
      const details = error as { message?: string; details?: string; hint?: string; code?: string }
      console.error('Erro ao criar racha:', {
        message: details?.message,
        code: details?.code,
        details: details?.details,
        hint: details?.hint,
      })
      toast(details?.message || 'Erro ao criar racha. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    setForm((prev) => {
      if (name === 'tipo') {
        const nextTipo = value as TipoRacha
        return { ...prev, tipo: nextTipo, escalacao_size: DEFAULT_SIZE_BY_TIPO[nextTipo] }
      }
      if (name === 'escalacao_size') {
        return { ...prev, escalacao_size: parseInt(value, 10) }
      }
      return {
        ...prev,
        [name]: type === 'checkbox'
          ? checked
          : name.includes('valor')
            ? parseInt(value) * 100
            : name.includes('temporada_mes') || name.includes('temporada_ano')
              ? parseInt(value)
              : value,
      }
    })
  }

  if (user && !isAdmin) {
    return (
      <div className="card text-center py-10">
        <h1 className="text-xl font-semibold text-white mb-2">Acesso restrito</h1>
        <p className="text-gray-400">Apenas administradores podem criar rachas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Novo Racha</h1>

      {!inviteLinks ? (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <FormField label="Nome do Racha">
            <Input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              placeholder="Ex: Racha do Sábado"
              required
            />
          </FormField>
          <FormField label="Tipo de Racha">
            <Select name="tipo" value={form.tipo} onChange={handleChange}>
              <option value="campo">Campo (11x11)</option>
              <option value="society">Society</option>
              <option value="futsal">Futsal (5x5)</option>
            </Select>
          </FormField>
          {form.tipo === 'society' && (
            <FormField label="Atletas por time" hint="Quantos jogadores entram em campo por time">
              <Select
                name="escalacao_size"
                value={form.escalacao_size}
                onChange={handleChange}
              >
                {SOCIETY_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}v{n}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          <FormField label="Mensalidade (R$)" hint="Deixe 0 se não cobra mensalidade fixa">
            <Input
              type="number"
              name="valor_mensalidade"
              value={form.valor_mensalidade / 100}
              onChange={handleChange}
              placeholder="0"
              min="0"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Multa Amarelo (R$)">
              <Input
                type="number"
                name="valor_cartao_amarelo"
                value={form.valor_cartao_amarelo / 100}
                onChange={handleChange}
                min="0"
              />
            </FormField>
            <FormField label="Multa Vermelho (R$)">
              <Input
                type="number"
                name="valor_cartao_vermelho"
                value={form.valor_cartao_vermelho / 100}
                onChange={handleChange}
                min="0"
              />
            </FormField>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="criar_temporada"
                checked={form.criar_temporada}
                onChange={handleChange}
                className="mt-1 h-4 w-4 accent-emerald-500"
              />
              <span>
                <span className="flex items-center gap-2 font-semibold text-white">
                  <CalendarDays size={18} className="text-emerald-400" />
                  Criar temporada inicial
                </span>
                <span className="block text-sm text-gray-400 mt-1">
                  Ideal para rachas mensais com times fixos, tabela e campeão do mês.
                </span>
              </span>
            </label>

            {form.criar_temporada && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <FormField label="Nome da temporada">
                    <Input
                      type="text"
                      name="temporada_nome"
                      value={form.temporada_nome}
                      onChange={handleChange}
                      placeholder="Ex: Temporada Junho/2026"
                      required={form.criar_temporada}
                    />
                  </FormField>
                </div>
                <FormField label="Mês">
                  <Select name="temporada_mes" value={form.temporada_mes} onChange={handleChange}>
                    <option value={1}>Janeiro</option>
                    <option value={2}>Fevereiro</option>
                    <option value={3}>Março</option>
                    <option value={4}>Abril</option>
                    <option value={5}>Maio</option>
                    <option value={6}>Junho</option>
                    <option value={7}>Julho</option>
                    <option value={8}>Agosto</option>
                    <option value={9}>Setembro</option>
                    <option value={10}>Outubro</option>
                    <option value={11}>Novembro</option>
                    <option value={12}>Dezembro</option>
                  </Select>
                </FormField>
                <FormField label="Ano">
                  <Input
                    type="number"
                    name="temporada_ano"
                    value={form.temporada_ano}
                    onChange={handleChange}
                    min="2024"
                    max="2100"
                  />
                </FormField>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Criando...' : form.criar_temporada ? 'Criar Racha e Temporada' : 'Criar Racha'}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Header de Sucesso */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Racha criado!</h2>
            <p className="text-gray-400">
              Compartilhe os convites para sua galera entrar.
            </p>
          </div>

          {/* Cards de Convite */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Atleta */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40">
              {/* Imagem/Gradiente de fundo */}
              <div className="h-36 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
                <Dribbble className="w-20 h-20 text-white/90" strokeWidth={1.5} />
              </div>

              {/* Conteúdo */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-lg">Atletas</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">Para quem vai jogar no racha</p>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLinks.atleta)
                    toast('Link de atleta copiado!', 'success')
                  }}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={18} />
                  Copiar Link
                </button>
              </div>
            </div>

            {/* Card Admin */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40">
              {/* Imagem/Gradiente de fundo */}
              <div className="h-36 bg-gradient-to-br from-amber-600 via-orange-500 to-yellow-400 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
                <ClipboardList className="w-20 h-20 text-white/90" strokeWidth={1.5} />
              </div>

              {/* Conteúdo */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-lg">Administradores</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">Para quem organiza o racha</p>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLinks.admin)
                    toast('Link de admin copiado!', 'success')
                  }}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={18} />
                  Copiar Link
                </button>
              </div>
            </div>
          </div>

          {/* Botão Ir para Racha */}
          <button
            className="btn-primary w-full flex items-center justify-center gap-2 py-4"
            onClick={() => createdRachaId && navigate(`/racha/${createdRachaId}`)}
          >
            Ir para o Racha
            <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
