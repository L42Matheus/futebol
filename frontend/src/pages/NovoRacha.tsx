import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, Copy, Users, ClipboardList, ArrowRight, CalendarDays, Share2 } from 'lucide-react'
import { compartilharLink, copiarTexto } from '../utils/compartilhar'
import { rachasApi, authApi, temporadasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import FormField from '../components/FormField'
import { Input, Select } from '../components/Input'
import { ESPORTES, getEsporte, getModalidade, type EsporteId } from '../esportes'
import type { TipoRacha } from '../types'
import { ehEsporte, lerEsporteEscolhido, limparEsporteEscolhido } from '../utils/esporteEscolhido'

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
  const [searchParams] = useSearchParams()
  // Abre no esporte escolhido na landing (?esporte=volei ou o que ficou guardado no cadastro).
  const [esporteId, setEsporteId] = useState<EsporteId>(() => {
    const doLink = searchParams.get('esporte')
    return ehEsporte(doLink) ? doLink : lerEsporteEscolhido() ?? 'futebol'
  })
  const esporte = getEsporte(esporteId)
  const [form, setForm] = useState<RachaForm>({
    nome: '',
    tipo: esporte.modalidades[0].id,
    escalacao_size: esporte.modalidades[0].jogadoresPorTime,
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
      limparEsporteEscolhido()
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
        return { ...prev, tipo: nextTipo, escalacao_size: getModalidade(nextTipo).jogadoresPorTime }
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

  function escolherEsporte(id: EsporteId) {
    const primeira = getEsporte(id).modalidades[0]
    setEsporteId(id)
    setForm((prev) => ({ ...prev, tipo: primeira.id, escalacao_size: primeira.jogadoresPorTime }))
  }

  const modalidadeAtual = getModalidade(form.tipo)

  const convites = inviteLinks
    ? [
        {
          titulo: 'Atletas',
          descricao: 'Para quem vai jogar no racha',
          link: inviteLinks.atleta,
          icone: <Users size={20} />,
          cor: 'text-emerald-400',
          fundo: 'bg-emerald-500/10',
          botao: 'bg-emerald-600 hover:bg-emerald-700',
        },
        {
          titulo: 'Administradores',
          descricao: 'Para quem ajuda a organizar',
          link: inviteLinks.admin,
          icone: <ClipboardList size={20} />,
          cor: 'text-amber-400',
          fundo: 'bg-amber-500/10',
          botao: 'bg-amber-600 hover:bg-amber-700',
        },
      ]
    : []

  async function copiarConvite(link: string) {
    const copiou = await copiarTexto(link)
    toast(copiou ? 'Link copiado!' : 'Não consegui copiar o link.', copiou ? 'success' : 'error')
  }

  async function enviarConvite(link: string, titulo: string) {
    const papel = titulo === 'Atletas' ? 'jogar' : 'ajudar a organizar'
    const resultado = await compartilharLink(link, `Entra no ${form.nome || 'nosso racha'} no QuemJoga para ${papel}:`)
    if (resultado === 'copiado') toast('Link copiado! Cole no grupo da galera.', 'success')
    if (resultado === 'falhou') toast('Não consegui compartilhar o link.', 'error')
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
      {/* No celular o título já está no cabeçalho do app. */}
      <h1 className="hidden text-2xl font-bold text-white md:block">Novo Racha</h1>

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
          <FormField label="Esporte">
            <div className="grid grid-cols-3 gap-3">
              {ESPORTES.map(({ id, nome, Icone }) => {
                const ativo = id === esporteId
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => escolherEsporte(id)}
                    aria-pressed={ativo}
                    className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-sm font-semibold transition-colors ${
                      ativo
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-gray-800 bg-gray-900/40 text-gray-400 hover:border-gray-600 hover:text-white'
                    }`}
                  >
                    <Icone size={32} />
                    {nome}
                  </button>
                )
              })}
            </div>
          </FormField>
          <FormField label="Modalidade" hint={modalidadeAtual.descricao}>
            <Select name="tipo" value={form.tipo} onChange={handleChange}>
              {esporte.modalidades.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </Select>
          </FormField>
          {modalidadeAtual.tamanhos && (
            <FormField label="Atletas por time" hint="Quantos jogadores entram em campo por time">
              <Select
                name="escalacao_size"
                value={form.escalacao_size}
                onChange={handleChange}
              >
                {modalidadeAtual.tamanhos.map((n) => (
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
          {esporte.recursos.includes('cartoes') && (
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
          )}

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
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-white">{form.nome || 'Racha'} criado!</h2>
              <p className="text-sm text-gray-400">Agora chame a galera pelo link de convite.</p>
            </div>
          </div>

          {/* Convites: uma linha por tipo, com enviar (folha de compartilhamento) e copiar. */}
          <div className="divide-y divide-gray-800 rounded-3xl border border-gray-800 bg-gray-900/40">
            {convites.map((convite) => (
              <div key={convite.titulo} className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${convite.fundo} ${convite.cor}`}>
                    {convite.icone}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white">{convite.titulo}</h3>
                    <p className="text-sm text-gray-400">{convite.descricao}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void enviarConvite(convite.link, convite.titulo)}
                    className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-semibold text-branco transition-colors ${convite.botao}`}
                  >
                    <Share2 size={16} />
                    Enviar convite
                  </button>
                  <button
                    type="button"
                    onClick={() => void copiarConvite(convite.link)}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-700 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
                  >
                    <Copy size={16} />
                    Copiar link
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="px-1 text-xs text-gray-500">
            Cuidado com o link de administrador: quem entrar por ele pode gerenciar o racha.
          </p>

          <button
            type="button"
            className="btn-primary w-full flex items-center justify-center gap-2 py-4"
            onClick={() => createdRachaId && navigate(`/racha/${createdRachaId}`)}
          >
            Ir para o racha
            <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
