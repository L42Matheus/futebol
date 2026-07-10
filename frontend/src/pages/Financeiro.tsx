import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Check, X, DollarSign, Users, MessageCircle } from 'lucide-react'
import { rachasApi, pagamentosApi, atletasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PAGAMENTO_TIPO_LABELS } from '../constants'
import InputDialog from '../components/InputDialog'
import type { Atleta, Pagamento, Saldo, PagamentoStatus } from '../types'

interface AtletaFinanceiro {
  atleta: Atleta
  pagamento?: Pagamento
}

const STATUS_COLORS: Record<PagamentoStatus, string> = {
  pendente: 'bg-gray-700 text-gray-300',
  aguardando_aprovacao: 'bg-amber-500/20 text-amber-400',
  aprovado: 'bg-emerald-500/20 text-emerald-400',
  rejeitado: 'bg-red-500/20 text-red-400',
}

const STATUS_LABELS: Record<PagamentoStatus, string> = {
  pendente: 'em aberto',
  aguardando_aprovacao: 'em análise',
  aprovado: 'pago',
  rejeitado: 'rejeitado',
}

function referenciaMesAtual() {
  const now = new Date()
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
}

function formatCurrencyFromCents(value?: number | null) {
  const safeValue = Number(value || 0)
  return `R$ ${(safeValue / 100).toFixed(2)}`
}

function buildWhatsAppUrl(atleta: Atleta, referencia: string) {
  if (!atleta.telefone) return null
  const phone = atleta.telefone.replace(/\D/g, '')
  if (!phone) return null

  const message = encodeURIComponent(
    `Oi, ${atleta.apelido || atleta.nome}! Passando para lembrar da mensalidade do racha referente a ${referencia}.`,
  )
  return `https://wa.me/55${phone}?text=${message}`
}

export default function Financeiro() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const [saldo, setSaldo] = useState<Saldo | null>(null)
  const [pendentes, setPendentes] = useState<AtletaFinanceiro[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [confirmados, setConfirmados] = useState<AtletaFinanceiro[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pendentes' | 'historico' | 'confirmados'>('pendentes')
  const [pagandoId, setPagandoId] = useState<number | null>(null)
  const [rejeitarId, setRejeitarId] = useState<number | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'
  const referenciaAtual = referenciaMesAtual()

  const loadData = useCallback(async () => {
    if (!rachaId) return
    try {
      const [saldoRes, atletasRes, pagamentosRes] = await Promise.all([
        rachasApi.getSaldo(rachaId),
        atletasApi.list(rachaId),
        pagamentosApi.list(rachaId),
      ])

      const mensalidadesMes = pagamentosRes.data.filter(
        (pagamento) => pagamento.tipo === 'mensalidade' && pagamento.referencia === referenciaAtual,
      )
      const pagamentoPorAtleta = new Map<number, Pagamento>()
      mensalidadesMes.forEach((pagamento) => {
        pagamentoPorAtleta.set(pagamento.atleta_id, pagamento)
      })

      const atletasFinanceiro = atletasRes.data.map((atleta) => ({
        atleta,
        pagamento: pagamentoPorAtleta.get(atleta.id),
      }))

      setSaldo(saldoRes.data)
      setPendentes(
        atletasFinanceiro.filter(({ pagamento }) => pagamento?.status !== 'aprovado'),
      )
      setConfirmados(
        atletasFinanceiro.filter(({ pagamento }) => pagamento?.status === 'aprovado'),
      )
      setPagamentos(pagamentosRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [rachaId, referenciaAtual])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleAprovar(id: number) {
    if (!user) return
    try {
      await pagamentosApi.aprovar(id, user.id, true)
      toast('Pagamento aprovado!', 'success')
      loadData()
    } catch {
      toast('Erro ao aprovar pagamento.', 'error')
    }
  }

  async function handleRejeitarConfirm(motivo: string) {
    if (rejeitarId === null || !user) return
    try {
      await pagamentosApi.aprovar(rejeitarId, user.id, false, motivo)
      toast('Pagamento rejeitado.', 'info')
      loadData()
    } catch {
      toast('Erro ao rejeitar pagamento.', 'error')
    } finally {
      setRejeitarId(null)
    }
  }

  async function handleConfirmarPagamento(atletaId: number, confirmado: boolean) {
    setPagandoId(atletaId)
    try {
      await atletasApi.confirmarPagamento(atletaId, confirmado, {
        referencia: referenciaAtual,
        valor: 1,
      })
      await loadData()
      toast(confirmado ? 'Pagamento confirmado.' : 'Pagamento voltou para pendente.', 'success')
    } catch {
      toast('Erro ao confirmar pagamento.', 'error')
    } finally {
      setPagandoId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="card text-center py-10">
        <h1 className="text-xl font-semibold text-white mb-2">Acesso restrito</h1>
        <p className="text-gray-400">Apenas administradores podem acessar o financeiro.</p>
      </div>
    )
  }

  const tabClass = (t: string) =>
    `inline-block px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-emerald-500 text-emerald-500'
        : 'border-transparent text-gray-400 hover:text-emerald-500 hover:border-emerald-500'
    }`
  const totalAtletasFinanceiro = confirmados.length + pendentes.length

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-xl font-bold text-white">Financeiro</h1>

      {saldo && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-emerald-700/40 bg-emerald-900/40 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Saldo</p>
            <p className="mt-2 text-3xl font-black text-white">{saldo.saldo_formatado}</p>
          </div>
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-amber-300">A receber</p>
            <p className="mt-2 text-2xl font-black text-white">{saldo.pendente_formatado}</p>
          </div>
          <div className="col-span-2 rounded-3xl border border-gray-800 bg-gray-900/40 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Mensalidade atual</p>
            <p className="mt-2 text-sm font-semibold text-gray-300">
              {totalAtletasFinanceiro > 0
                ? `${confirmados.length} de ${totalAtletasFinanceiro} atletas pagos em ${referenciaAtual}`
                : 'Cadastre atletas para acompanhar os pagamentos do mês'}
            </p>
          </div>
        </div>
      )}

      <ul className="flex items-center gap-1 border-b border-gray-800">
        <li><button onClick={() => setTab('pendentes')} className={tabClass('pendentes')}>Pendentes ({pendentes.length})</button></li>
        <li><button onClick={() => setTab('historico')} className={tabClass('historico')}>Histórico</button></li>
        <li><button onClick={() => setTab('confirmados')} className={tabClass('confirmados')}>Confirmados ({confirmados.length})</button></li>
      </ul>

      {tab === 'pendentes' && (
        <div className="space-y-3">
          {pendentes.length === 0 ? (
            <div className="card text-center py-8">
              <Check size={48} className="mx-auto text-emerald-500 mb-4" />
              <p className="font-bold text-white">
                {totalAtletasFinanceiro > 0 ? 'Todo mundo em dia' : 'Nenhum atleta cadastrado'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {totalAtletasFinanceiro > 0
                  ? `Nenhum atleta pendente em ${referenciaAtual}.`
                  : 'Adicione atletas ao racha para controlar quem pagou.'}
              </p>
            </div>
          ) : (
            pendentes.map(({ atleta, pagamento }) => {
              const whatsappUrl = buildWhatsAppUrl(atleta, referenciaAtual)
              return (
              <div key={atleta.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold text-white">{atleta.apelido || atleta.nome}</p>
                    <p className="text-sm text-gray-400">Mensalidade {referenciaAtual}</p>
                    {pagamento && (
                      <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${STATUS_COLORS[pagamento.status]}`}>
                        {STATUS_LABELS[pagamento.status]}
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-white">
                    {pagamento?.valor_formatado || formatCurrencyFromCents(0)}
                  </p>
                </div>
                {pagamento?.comprovante_url && (
                  <a
                    href={pagamento.comprovante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400 underline mb-3 block"
                  >
                    Ver comprovante
                  </a>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      pagamento?.status === 'aguardando_aprovacao'
                        ? handleAprovar(pagamento.id)
                        : handleConfirmarPagamento(atleta.id, true)
                    }
                    disabled={pagandoId === atleta.id}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> {pagamento?.status === 'aguardando_aprovacao' ? 'Aprovar' : 'Marcar pago'}
                  </button>
                  {pagamento?.status === 'aguardando_aprovacao' ? (
                    <button
                      onClick={() => setRejeitarId(pagamento.id)}
                      className="flex-1 btn-secondary flex items-center justify-center gap-2 !text-red-400 hover:!text-red-300"
                    >
                      <X size={18} /> Rejeitar
                    </button>
                  ) : whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn-secondary flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={18} /> Cobrar
                    </a>
                  ) : null}
                </div>
              </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'historico' && (
        <div className="card divide-y divide-gray-800">
          {pagamentos.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">Nenhum pagamento registrado</p>
            </div>
          ) : (
            pagamentos.map((p) => (
              <div key={p.id} className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{p.atleta_nome}</p>
                  <p className="text-sm text-gray-400">
                    {PAGAMENTO_TIPO_LABELS[p.tipo]} — {p.referencia}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">{p.valor_formatado}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[p.status]}`}>
                    {p.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'confirmados' && (
        <div className="card divide-y divide-gray-800">
          {confirmados.length === 0 ? (
            <div className="text-center py-8">
              <Users size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">Nenhum atleta pago em {referenciaAtual}</p>
            </div>
          ) : (
            confirmados.map(({ atleta, pagamento }) => (
              <div key={atleta.id} className="py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{atleta.apelido || atleta.nome}</p>
                  <p className="text-sm text-gray-400">
                    Mensalidade {referenciaAtual} {pagamento?.valor_formatado ? `• ${pagamento.valor_formatado}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleConfirmarPagamento(atleta.id, false)}
                  disabled={pagandoId === atleta.id}
                  className="shrink-0 rounded-2xl border border-gray-700 bg-gray-950/40 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white disabled:opacity-50"
                >
                  Desfazer
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* InputDialog substitui window.prompt */}
      <InputDialog
        open={rejeitarId !== null}
        title="Rejeitar pagamento"
        description="Informe o motivo da rejeição para o atleta."
        label="Motivo"
        placeholder="Ex: comprovante ilegível, valor incorreto..."
        confirmLabel="Rejeitar"
        cancelLabel="Cancelar"
        onConfirm={handleRejeitarConfirm}
        onCancel={() => setRejeitarId(null)}
      />
    </div>
  )
}
