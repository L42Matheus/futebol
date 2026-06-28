import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, QrCode, Copy, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { assinaturaApi } from '../services/api'
import { formatCurrency, formatDateBR } from '../utils/formatters'
import type { AssinaturaStatus, AssinarResponse } from '../types'

type Metodo = 'PIX' | 'CREDIT_CARD'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: 'Ativa', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  pending: { label: 'Aguardando pagamento', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  overdue: { label: 'Em atraso', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
  canceled: { label: 'Cancelada', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
}

export default function Assinatura() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [status, setStatus] = useState<AssinaturaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [resultado, setResultado] = useState<AssinarResponse | null>(null)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [metodo, setMetodo] = useState<Metodo>('PIX')
  const [cpfCnpj, setCpfCnpj] = useState('')
  // Campos de cartão (exigidos pela Asaas quando billing_type = CREDIT_CARD)
  const [card, setCard] = useState({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '' })
  const [holder, setHolder] = useState({ name: '', email: '', postalCode: '', addressNumber: '', phone: '' })

  // Apenas admin pode ver esta tela
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/app', { replace: true })
    }
  }, [user, navigate])

  const carregarStatus = () => {
    setLoading(true)
    assinaturaApi
      .status()
      .then(({ data }) => setStatus(data))
      .catch(() => toast('Não foi possível carregar o status da assinatura', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (user?.role === 'admin') carregarStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Polling após gerar uma cobrança: a cada 4s busca o status até virar 'active'.
  // Para imediatamente quando confirma ou quando o usuário sai da tela.
  useEffect(() => {
    if (!resultado || paymentConfirmed) return
    if (status?.subscription_status === 'active') return

    const tick = async () => {
      try {
        const { data } = await assinaturaApi.status()
        setStatus(data)
        if (data.subscription_status === 'active') {
          setPaymentConfirmed(true)
        }
      } catch {
        // ignora erros transitórios — o próximo tick tenta de novo
      }
    }
    pollTimerRef.current = setInterval(tick, 4000)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [resultado, paymentConfirmed, status?.subscription_status])

  // Quando confirma, dá 4s pro usuário ler a mensagem e redireciona.
  useEffect(() => {
    if (!paymentConfirmed) return
    toast('Pagamento confirmado! Bem-vindo.', 'success')
    redirectTimerRef.current = setTimeout(() => {
      navigate('/app', { replace: true })
    }, 4000)
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [paymentConfirmed, navigate, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cpf = cpfCnpj.replace(/\D/g, '')
    if (cpf.length !== 11 && cpf.length !== 14) {
      toast('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido', 'error')
      return
    }
    setSubmitting(true)
    try {
      const payload: Parameters<typeof assinaturaApi.assinar>[0] = {
        cpf_cnpj: cpf,
        billing_type: metodo,
      }
      if (metodo === 'CREDIT_CARD') {
        payload.card = { ...card, number: card.number.replace(/\s/g, '') }
        payload.holder_info = {
          name: holder.name,
          email: holder.email || user?.email || '',
          cpfCnpj: cpf,
          postalCode: holder.postalCode.replace(/\D/g, ''),
          addressNumber: holder.addressNumber,
          ...(holder.phone ? { phone: holder.phone.replace(/\D/g, '') } : {}),
        }
      }
      const { data } = await assinaturaApi.assinar(payload)
      setResultado(data)
      toast(
        metodo === 'PIX' ? 'Cobrança Pix gerada com sucesso' : 'Assinatura criada',
        'success',
      )
      carregarStatus()
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(detail || 'Falha ao processar a assinatura', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const copiarPix = () => {
    const payload = resultado?.pix?.payload
    if (!payload) return
    navigator.clipboard?.writeText(payload)
    toast('Código Pix copiado', 'success')
  }

  if (loading) {
    return <p className="text-gray-400">Carregando assinatura…</p>
  }

  if (paymentConfirmed) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
          <CheckCircle size={48} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Pagamento confirmado!</h1>
          <p className="text-gray-400 mt-2">
            Sua assinatura está <span className="text-emerald-400 font-semibold">ativa</span>.
            {status?.current_period_end && (
              <> Próxima cobrança em <strong className="text-white">{formatDateBR(status.current_period_end)}</strong>.</>
            )}
          </p>
        </div>
        <p className="text-xs text-gray-500">Redirecionando para o app…</p>
        <button
          onClick={() => navigate('/app', { replace: true })}
          className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
        >
          Ir agora
        </button>
      </div>
    )
  }

  const statusKey = status?.subscription_status ?? ''
  const badge = STATUS_LABEL[statusKey]
  const valor = status ? formatCurrency(status.valor) : 'R$ 29,90'

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Assinatura</h1>
        <p className="text-gray-400 text-sm mt-1">
          Plano de gestão do QuemJogaFC — {valor}/mês.
        </p>
      </div>

      {/* Card de status */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Situação atual</span>
          {badge ? (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${badge.cls}`}>
              {badge.label}
            </span>
          ) : status?.in_trial ? (
            <span className="text-xs font-semibold px-3 py-1 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/30">
              Período de teste
            </span>
          ) : (
            <span className="text-xs font-semibold px-3 py-1 rounded-full border bg-gray-500/10 text-gray-400 border-gray-500/30">
              Sem assinatura
            </span>
          )}
        </div>

        {status?.in_trial && status.trial_ends_at && (
          <p className="text-sm text-gray-300 flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-400" />
            Teste grátis até <strong className="text-white">{formatDateBR(status.trial_ends_at)}</strong>.
          </p>
        )}
        {status?.subscription_status === 'active' && status.current_period_end && (
          <p className="text-sm text-gray-300 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400" />
            Próxima cobrança em <strong className="text-white">{formatDateBR(status.current_period_end)}</strong>.
          </p>
        )}
      </div>

      {/* Resultado do Pix gerado */}
      {resultado?.billing_type === 'PIX' && (
        <div className="bg-gray-900/60 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-white font-semibold flex items-center gap-2">
              <QrCode size={18} className="text-emerald-400" /> Pague com Pix
            </p>
            <span className="inline-flex items-center gap-2 text-xs text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Aguardando confirmação automática…
            </span>
          </div>
          {resultado.pix?.encoded_image && (
            <img
              src={`data:image/png;base64,${resultado.pix.encoded_image}`}
              alt="QR Code Pix"
              className="w-48 h-48 rounded-xl bg-white p-2 mx-auto"
            />
          )}
          {resultado.pix?.payload && (
            <button
              onClick={copiarPix}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Copy size={16} /> Copiar código Pix (copia e cola)
            </button>
          )}
          {!resultado.pix && (
            <p className="text-xs text-amber-400">
              O QR Code Pix não está disponível no momento. Use o link da fatura abaixo para concluir o pagamento.
            </p>
          )}
          {resultado.invoice_url && (
            <a
              href={resultado.invoice_url}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
            >
              <ExternalLink size={16} /> Abrir fatura no navegador
            </a>
          )}
        </div>
      )}

      {/* Confirmação de cartão */}
      {resultado?.billing_type === 'CREDIT_CARD' && (
        <div className="bg-gray-900/60 border border-emerald-500/30 rounded-2xl p-5">
          <p className="text-white font-semibold flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-400" /> Assinatura no cartão criada
          </p>
          <p className="text-sm text-gray-400 mt-1">
            A confirmação do pagamento pode levar alguns instantes. O status acima é atualizado
            automaticamente.
          </p>
        </div>
      )}

      {/* Formulário de pagamento */}
      {status?.subscription_status !== 'active' && (
        <form onSubmit={handleSubmit} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
          <p className="text-white font-semibold">Pagar mensalidade</p>

          {/* Seleção de método */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMetodo('PIX')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                metodo === 'PIX'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'border-gray-700 text-gray-400 hover:bg-gray-800'
              }`}
            >
              <QrCode size={16} /> Pix
            </button>
            <button
              type="button"
              onClick={() => setMetodo('CREDIT_CARD')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                metodo === 'CREDIT_CARD'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'border-gray-700 text-gray-400 hover:bg-gray-800'
              }`}
            >
              <CreditCard size={16} /> Cartão
            </button>
          </div>

          <Field label="CPF ou CNPJ do responsável">
            <input
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder="Somente números"
              inputMode="numeric"
              required
              className="input"
            />
          </Field>

          {metodo === 'CREDIT_CARD' && (
            <div className="space-y-3 pt-1">
              <Field label="Nome impresso no cartão">
                <input value={card.holderName} onChange={(e) => setCard({ ...card, holderName: e.target.value })} required className="input" />
              </Field>
              <Field label="Número do cartão">
                <input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} inputMode="numeric" required className="input" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Mês">
                  <input value={card.expiryMonth} onChange={(e) => setCard({ ...card, expiryMonth: e.target.value })} placeholder="MM" required className="input" />
                </Field>
                <Field label="Ano">
                  <input value={card.expiryYear} onChange={(e) => setCard({ ...card, expiryYear: e.target.value })} placeholder="AAAA" required className="input" />
                </Field>
                <Field label="CVV">
                  <input value={card.ccv} onChange={(e) => setCard({ ...card, ccv: e.target.value })} inputMode="numeric" required className="input" />
                </Field>
              </div>
              <Field label="Nome do titular (cadastro)">
                <input value={holder.name} onChange={(e) => setHolder({ ...holder, name: e.target.value })} required className="input" />
              </Field>
              <Field label="E-mail do titular">
                <input type="email" value={holder.email} onChange={(e) => setHolder({ ...holder, email: e.target.value })} placeholder={user?.email || ''} className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CEP">
                  <input value={holder.postalCode} onChange={(e) => setHolder({ ...holder, postalCode: e.target.value })} inputMode="numeric" required className="input" />
                </Field>
                <Field label="Número">
                  <input value={holder.addressNumber} onChange={(e) => setHolder({ ...holder, addressNumber: e.target.value })} required className="input" />
                </Field>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
          >
            {submitting ? 'Processando…' : `Pagar ${valor}`}
          </button>
          <p className="text-[11px] text-gray-500 text-center">
            Pagamento processado com segurança pela Asaas.
          </p>
        </form>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
