import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Check, X, DollarSign, Users } from 'lucide-react'
import { rachasApi, pagamentosApi, atletasApi, jogosApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PAGAMENTO_TIPO_LABELS } from '../constants'
import InputDialog from '../components/InputDialog'
import type { Pagamento, Saldo, PagamentoStatus } from '../types'

interface ConfirmadoComPagamento {
  atleta_id: number
  nome: string
  ja_pagou: boolean
}

const STATUS_COLORS: Record<PagamentoStatus, string> = {
  pendente: 'bg-gray-700 text-gray-300',
  aguardando_aprovacao: 'bg-amber-500/20 text-amber-400',
  aprovado: 'bg-emerald-500/20 text-emerald-400',
  rejeitado: 'bg-red-500/20 text-red-400',
}

export default function Financeiro() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const [saldo, setSaldo] = useState<Saldo | null>(null)
  const [pendentes, setPendentes] = useState<Pagamento[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [confirmados, setConfirmados] = useState<ConfirmadoComPagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pendentes' | 'historico' | 'confirmados'>('pendentes')
  const [pagandoId, setPagandoId] = useState<number | null>(null)
  const [rejeitarId, setRejeitarId] = useState<number | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  const loadData = useCallback(async () => {
    if (!rachaId) return
    try {
      const jogosRes = await jogosApi.list(rachaId, false)
      const jogoRecente = jogosRes.data?.[0]
      if (jogoRecente) {
        const listaRes = await jogosApi.getLista(jogoRecente.id)
        const jogadoresConfirmados = listaRes.data.confirmados
        // NOTE: N+1 aqui é uma limitação atual; o ideal é o backend retornar ja_pagou na lista
        const confirmadosComPagamento = await Promise.all(
          jogadoresConfirmados.map(async (jogador) => {
            const historicoRes = await atletasApi.getHistorico(jogador.atleta_id)
            return {
              ...jogador,
              ja_pagou: historicoRes.data.financeiro.pagamento_confirmado_mes_atual,
            }
          }),
        )
        setConfirmados(confirmadosComPagamento)
      } else {
        setConfirmados([])
      }

      const [saldoRes, pendentesRes, pagamentosRes] = await Promise.all([
        rachasApi.getSaldo(rachaId),
        pagamentosApi.getPendentes(rachaId),
        pagamentosApi.list(rachaId),
      ])
      setSaldo(saldoRes.data)
      setPendentes(pendentesRes.data)
      setPagamentos(pagamentosRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [rachaId])

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
      await atletasApi.confirmarPagamento(atletaId, confirmado, { valor: 1 })
      await loadData()
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

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-xl font-bold text-white">Financeiro</h1>

      {saldo && (
        <div className="card bg-gradient-to-r from-emerald-900/60 to-emerald-800/40 border-emerald-700/40">
          <p className="text-emerald-300 text-sm">Saldo do Racha</p>
          <p className="text-3xl font-bold text-white">{saldo.saldo_formatado}</p>
          {saldo.pendente > 0 && (
            <p className="text-amber-400 text-sm mt-2">
              {saldo.pendente_formatado} aguardando aprovação
            </p>
          )}
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
              <p className="text-gray-400">Nenhum pagamento pendente</p>
            </div>
          ) : (
            pendentes.map((p) => (
              <div key={p.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-white">{p.atleta_nome}</p>
                    <p className="text-sm text-gray-400">
                      {PAGAMENTO_TIPO_LABELS[p.tipo]} — {p.referencia}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-white">{p.valor_formatado}</p>
                </div>
                {p.comprovante_url && (
                  <a
                    href={p.comprovante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400 underline mb-3 block"
                  >
                    Ver comprovante
                  </a>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAprovar(p.id)}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> Aprovar
                  </button>
                  <button
                    onClick={() => setRejeitarId(p.id)}
                    className="flex-1 btn-secondary flex items-center justify-center gap-2 !text-red-400 hover:!text-red-300"
                  >
                    <X size={18} /> Rejeitar
                  </button>
                </div>
              </div>
            ))
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
              <p className="text-gray-400">Nenhum jogador confirmado</p>
            </div>
          ) : (
            confirmados.map((p) => (
              <div key={p.atleta_id} className="py-4 flex items-center justify-between">
                <span className="font-medium text-white">{p.nome}</span>
                <button
                  onClick={() => handleConfirmarPagamento(p.atleta_id, !p.ja_pagou)}
                  disabled={pagandoId === p.atleta_id}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                    p.ja_pagou
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'bg-transparent border-gray-500 hover:border-emerald-400'
                  } ${pagandoId === p.atleta_id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {p.ja_pagou && <Check size={14} className="text-white" />}
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
