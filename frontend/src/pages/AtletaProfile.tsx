import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Camera, Edit2, Save, X, Trophy, CreditCard, AlertTriangle } from 'lucide-react'
import { atletasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import { labelPosicao } from '../esportes'
import { useEsporteDoRacha } from '../esportes/useEsporteDoRacha'

interface Atleta {
  id: number
  nome: string
  apelido?: string
  telefone?: string
  posicao: string
  numero_camisa?: number
  foto_url?: string
  user_id?: number
  is_admin: boolean
}

interface Historico {
  presencas: {
    total_jogos: number
    confirmados: number
    taxa_presenca: string
  }
  financeiro: {
    total_pago?: number
    total_pendente?: number
    pago_formatado: string
    pendente_formatado: string
    referencia_mes_atual?: string
    pagamento_confirmado_mes_atual?: boolean
  }
  cartoes: {
    amarelos: number
    vermelhos: number
  }
}

export default function AtletaProfile() {
  const { rachaId, atletaId } = useParams()
  const esporte = useEsporteDoRacha(rachaId)
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [atleta, setAtleta] = useState<Atleta | null>(null)
  const [historico, setHistorico] = useState<Historico | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [adminActionLoading, setAdminActionLoading] = useState(false)
  const [form, setForm] = useState({ nome: '', apelido: '', telefone: '', posicao: '', numero_camisa: '' })

  const isAdminView = user?.role === 'admin'
  const temCartoes = esporte?.recursos.includes('cartoes') ?? false
  const canEdit = atleta?.user_id === user?.id || isAdminView

  useEffect(() => {
    loadAtleta()
  }, [atletaId])

  async function loadAtleta() {
    try {
      const [atletaRes, historicoRes] = await Promise.all([
        atletasApi.get(atletaId),
        atletasApi.getHistorico(atletaId)
      ])
      setAtleta(atletaRes.data)
      setHistorico(historicoRes.data)
      setForm({
        nome: atletaRes.data.nome || '',
        apelido: atletaRes.data.apelido || '',
        telefone: atletaRes.data.telefone || '',
        posicao: atletaRes.data.posicao || '',
        numero_camisa: atletaRes.data.numero_camisa?.toString() || ''
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!atleta) return
    try {
      const updateData = {
        ...form,
        numero_camisa: form.numero_camisa ? parseInt(form.numero_camisa) : null
      }
      const res = await atletasApi.update(atleta.id, updateData)
      setAtleta(res.data)
      setEditing(false)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Erro ao salvar')
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !atleta) return

    // Validacao basica
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem muito grande. Maximo 5MB')
      return
    }

    setUploading(true)
    try {
      const res = await atletasApi.uploadFoto(atleta.id, file)
      setAtleta(res.data)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Erro ao enviar foto')
    } finally {
      setUploading(false)
    }
  }

  async function handleAddCartao(tipo: 'amarelo' | 'vermelho') {
    if (!atleta) return
    setAdminActionLoading(true)
    try {
      await atletasApi.addCartao(atleta.id, tipo)
      await loadAtleta()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Erro ao adicionar cartao')
    } finally {
      setAdminActionLoading(false)
    }
  }

  async function handleRemoveCartao(tipo: 'amarelo' | 'vermelho') {
    if (!atleta) return
    setAdminActionLoading(true)
    try {
      await atletasApi.removeCartao(atleta.id, tipo)
      await loadAtleta()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Erro ao remover cartao')
    } finally {
      setAdminActionLoading(false)
    }
  }

  async function handleTogglePagamentoConfirmado(checked: boolean) {
    if (!atleta) return
    setAdminActionLoading(true)
    try {
      await atletasApi.confirmarPagamento(atleta.id, checked)
      await loadAtleta()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Erro ao confirmar pagamento')
    } finally {
      setAdminActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!atleta) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Atleta nao encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Perfil</h1>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Edit2 size={18} />
            Editar
          </button>
        )}
      </div>

      {/* Foto e Info Principal */}
      <div className="card p-6">
        <div className="flex flex-col items-center">
          {/* Foto com opcao de upload */}
          <div className="relative">
            <Avatar
              src={atleta.foto_url}
              name={atleta.apelido || atleta.nome}
              size="xl"
            />
            {canEdit && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary-700 transition-colors"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Camera size={16} />
                  )}
                </button>
              </>
            )}
          </div>
          {canEdit && atleta.foto_url && (
            <button
              onClick={async () => {
                if (!window.confirm('Remover foto?')) return
                try {
                  const res = await atletasApi.removerFoto(atleta.id)
                  setAtleta(res.data)
                } catch (e: any) {
                  alert(e.response?.data?.detail || 'Erro ao remover foto')
                }
              }}
              className="mt-3 text-xs text-red-600"
            >
              Remover foto
            </button>
          )}

          {/* Nome e Posicao */}
          {editing ? (
            <div className="mt-4 w-full max-w-sm space-y-4">
              <div>
                <label className="label">Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Apelido</label>
                <input
                  type="text"
                  value={form.apelido}
                  onChange={(e) => setForm({ ...form, apelido: e.target.value })}
                  className="input"
                  placeholder="Como e conhecido no racha"
                />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="input"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="label">Posicao</label>
                <select
                  value={form.posicao}
                  onChange={(e) => setForm({ ...form, posicao: e.target.value })}
                  className="input"
                >
                  {Object.entries(esporte?.posicoes ?? {}).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Numero da Camisa</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={form.numero_camisa}
                  onChange={(e) => setForm({ ...form, numero_camisa: e.target.value })}
                  className="input"
                  placeholder="Ex: 10"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="mt-4 text-xl font-bold text-white">
                {atleta.apelido || atleta.nome}
              </h2>
              {atleta.apelido && (
                <p className="text-sm text-gray-500">{atleta.nome}</p>
              )}
              <div className="mt-2 flex items-center gap-3">
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                  {labelPosicao(atleta.posicao)}
                </span>
                {atleta.numero_camisa && (
                  <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm font-medium">
                    #{atleta.numero_camisa}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Estatisticas: todos os cards na mesma estrutura (ícone, número, nome e detalhe). */}
      {historico && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card flex flex-col items-center p-4 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Trophy size={20} />
            </span>
            <p className="mt-3 text-2xl font-black leading-none text-white">{historico.presencas.confirmados}</p>
            <p className="mt-1 text-xs font-semibold text-gray-500">Jogos</p>
            <p className="mt-auto pt-3 text-xs font-bold text-emerald-400">
              {Math.round(parseFloat(historico.presencas.taxa_presenca) || 0)}% de presença
            </p>
          </div>

          <div className="card flex flex-col items-center p-4 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <CreditCard size={20} />
            </span>
            <p className="mt-3 text-2xl font-black leading-none text-white">{historico.financeiro.pago_formatado}</p>
            <p className="mt-1 text-xs font-semibold text-gray-500">Pago</p>
            {(historico.financeiro.total_pendente ?? 0) > 0 && (
              <p className="mt-1 text-xs font-bold text-amber-400">{historico.financeiro.pendente_formatado} pendente</p>
            )}
            {isAdminView ? (
              <div className="mt-auto w-full pt-3">
                <button
                  type="button"
                  disabled={adminActionLoading}
                  onClick={() => handleTogglePagamentoConfirmado(!historico.financeiro.pagamento_confirmado_mes_atual)}
                  title={`Mensalidade de ${historico.financeiro.referencia_mes_atual || 'este mês'}`}
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                    historico.financeiro.pagamento_confirmado_mes_atual
                      ? 'bg-emerald-500 text-branco'
                      : 'border border-gray-700 text-gray-300 hover:border-emerald-500/50'
                  }`}
                >
                  {historico.financeiro.pagamento_confirmado_mes_atual ? '✓ Mês pago' : 'Marcar pago'}
                </button>
              </div>
            ) : (
              <p className="mt-auto pt-3 text-xs font-bold text-gray-400">
                {historico.financeiro.pagamento_confirmado_mes_atual ? 'Mês em dia' : 'Mês em aberto'}
              </p>
            )}
          </div>

          {temCartoes && (
            <div className="card col-span-2 p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="text-amber-400" size={18} />
                <p className="text-sm font-bold text-white">Cartões</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['amarelo', 'Amarelos', historico.cartoes.amarelos, 'bg-yellow-400'],
                  ['vermelho', 'Vermelhos', historico.cartoes.vermelhos, 'bg-red-500'],
                ] as const).map(([tipo, nome, total, cor]) => (
                  <div key={tipo} className="flex items-center justify-between gap-2 rounded-2xl border border-gray-800 px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className={`inline-block h-5 w-4 rounded-sm ${cor}`} />
                      <span className="text-xl font-black leading-none text-white">{total}</span>
                    </span>
                    {isAdminView ? (
                      <span className="flex gap-1">
                        <button
                          type="button"
                          aria-label={`Tirar cartão ${tipo}`}
                          onClick={() => handleRemoveCartao(tipo)}
                          disabled={adminActionLoading || total <= 0}
                          className="h-8 w-8 rounded-lg border border-gray-700 font-bold text-gray-300 hover:bg-gray-800 disabled:opacity-40"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          aria-label={`Dar cartão ${tipo}`}
                          onClick={() => handleAddCartao(tipo)}
                          disabled={adminActionLoading}
                          className={`h-8 w-8 rounded-lg font-bold disabled:opacity-40 ${cor} ${tipo === 'amarelo' ? 'text-slate-900' : 'text-branco'}`}
                        >
                          +
                        </button>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-gray-500">{nome}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


