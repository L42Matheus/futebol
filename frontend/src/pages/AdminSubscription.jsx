import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Trophy } from 'lucide-react'
import { billingApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

function formatDateTime(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const BENEFITS = [
  'Gestão completa de rachas',
  'Controle financeiro avançado',
  'Escalação automática de times',
  'Histórico e estatísticas',
  'Convites ilimitados para atletas',
]

export default function AdminSubscription() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')

  const checkoutStatus = searchParams.get('checkout')
  const sessionId = searchParams.get('session_id')

  const renewalLabel = useMemo(
    () => formatDateTime(user?.admin_subscription_current_period_end),
    [user?.admin_subscription_current_period_end],
  )

  useEffect(() => {
    if (user?.role && user.role !== 'admin') {
      navigate('/', { replace: true })
    }
  }, [navigate, user?.role])

  useEffect(() => {
    if (!sessionId || checkoutStatus !== 'success' || syncing || user?.role !== 'admin') return

    async function syncSubscription() {
      setSyncing(true)
      setError('')
      try {
        await billingApi.syncAdminSubscription(sessionId)
        const updatedUser = await refreshUser()
        if (updatedUser?.admin_billing_active) {
          navigate('/', { replace: true })
          return
        }
        setError('Pagamento recebido, mas a confirmação da assinatura ainda está em processamento.')
      } catch (requestError) {
        setError(requestError.response?.data?.detail || 'Não foi possível confirmar a assinatura agora.')
      } finally {
        setSyncing(false)
        setSearchParams((currentParams) => {
          const nextParams = new URLSearchParams(currentParams)
          nextParams.delete('session_id')
          return nextParams
        })
      }
    }

    syncSubscription()
  }, [checkoutStatus, navigate, refreshUser, searchParams, sessionId, setSearchParams, syncing, user?.role])

  async function handleStartTrial() {
    setError('')
    setLoading(true)
    try {
      const response = await billingApi.createAdminSubscriptionCheckout()
      window.location.href = response.data.url
    } catch (err) {
      setError('Não foi possível iniciar o checkout. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="bg-gray-900/70 border border-gray-800 rounded-[2rem] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Trophy size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tight">QuemJoga Pro</h1>
          </div>

          <div className="mb-6">
            <div className="text-3xl font-black text-white">
              R$ 29<span className="text-lg font-medium text-gray-400">/mês</span>
            </div>
            <p className="text-emerald-400 text-sm font-medium mt-1">
              após 7 dias grátis
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
                <span className="text-gray-200 text-sm">{benefit}</span>
              </div>
            ))}
          </div>

          {renewalLabel && (
            <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm text-gray-300">
                Próxima vigência registrada: <span className="text-white font-medium">{renewalLabel}</span>
              </p>
            </div>
          )}

          {checkoutStatus === 'canceled' && (
            <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              O checkout foi cancelado antes da confirmação do pagamento.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100 flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleStartTrial}
            disabled={syncing || loading}
            className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {syncing ? 'Confirmando pagamento...' : loading ? 'Redirecionando...' : 'Começar Teste Grátis de 7 Dias'}
          </button>
          <p className="text-center text-gray-500 text-xs mt-4">
            Cancele quando quiser. Sem compromisso.
          </p>
        </div>
      </div>
    </div>
  )
}
