import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, CreditCard } from 'lucide-react'
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

export default function AdminSubscription() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, refreshUser } = useAuth()
  const [processingCheckout, setProcessingCheckout] = useState(false)
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

  async function handleCheckout() {
    setProcessingCheckout(true)
    setError('')
    try {
      const response = await billingApi.createAdminSubscriptionCheckout()
      window.location.href = response.data.checkout_url
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Não foi possível iniciar o checkout do Stripe.')
      setProcessingCheckout(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl bg-gray-900/70 border border-gray-800 rounded-[2rem] p-8 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
          <CreditCard size={28} />
        </div>

        <h1 className="text-3xl font-black tracking-tight mb-3">Assinatura administrativa</h1>
        <p className="text-gray-300 leading-relaxed">
          Para entrar na área administrativa, sua conta precisa manter uma mensalidade ativa de
          <span className="text-white font-bold"> R$ 30,00 por mês</span>.
        </p>

        <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-emerald-400 mt-0.5" size={20} />
            <div className="space-y-1 text-sm text-gray-200">
              <p>A cobrança é recorrente no Stripe.</p>
              <p>Assim que a assinatura ficar ativa, o acesso admin é liberado automaticamente.</p>
              {renewalLabel && <p>Próxima vigência registrada: {renewalLabel}</p>}
            </div>
          </div>
        </div>

        {checkoutStatus === 'canceled' && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            O checkout foi cancelado antes da confirmação do pagamento.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100 flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleCheckout}
          disabled={processingCheckout || syncing}
          className="mt-8 w-full rounded-2xl bg-emerald-500 text-black font-black py-4 transition-opacity disabled:opacity-60"
        >
          {syncing
            ? 'Confirmando pagamento...'
            : processingCheckout
              ? 'Redirecionando para o Stripe...'
              : 'Pagar mensalidade no Stripe'}
        </button>
      </div>
    </div>
  )
}
