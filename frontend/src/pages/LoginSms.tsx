import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Trophy, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import authService from '../services/auth'
import { isSupabaseConfigured, sendSmsOtp, verifySmsOtp } from '../services/supabase'
import FormField from '../components/FormField'
import { Input } from '../components/Input'

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (!digits) return ''
  if (input.trim().startsWith('+')) return `+${digits}`
  // BR default: assume +55 quando não informado
  if (digits.length >= 10 && !digits.startsWith('55')) return `+55${digits}`
  return `+${digits}`
}

export default function LoginSms() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const fromRole = searchParams.get('fromRole') || 'atleta'
  const inviteToken = searchParams.get('invite') || ''
  const { refreshUser } = useAuth()

  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-900/40 rounded-2xl p-6 border border-gray-800 text-center text-gray-300">
          Login por SMS indisponível: Supabase não configurado.
        </div>
      </div>
    )
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const normalized = normalizePhone(phone)
      if (normalized.replace(/\D/g, '').length < 12) {
        throw new Error('Informe o telefone com DDD')
      }
      await sendSmsOtp(normalized)
      setPhone(normalized)
      setInfo('Código enviado por SMS.')
      setStep('code')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível enviar o código.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const accessToken = await verifySmsOtp(phone, code.trim())
      await authService.loginWithSupabaseAccessToken(accessToken, {
        inviteToken: inviteToken || null,
        role: fromRole,
      })
      await refreshUser()
      const redirectTo = (location.state as any)?.from?.pathname || '/app'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Código inválido. Tente novamente.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await sendSmsOtp(phone)
      setInfo('Novo código enviado.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível reenviar o código.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col">
      <div className="pt-6 px-4">
        <Link
          to="/login"
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
        <h1 className="text-2xl font-bold text-white">Entrar com SMS</h1>
        <p className="text-gray-400 mt-1">
          {step === 'phone'
            ? 'Vamos enviar um código pro seu celular'
            : `Digite o código enviado para ${phone}`}
        </p>
      </div>

      <div className="flex-1 px-4 pb-8">
        <form
          onSubmit={step === 'phone' ? handleSendCode : handleVerifyCode}
          className="max-w-md mx-auto bg-gray-900/40 rounded-2xl p-6 border border-gray-800 space-y-4"
        >
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          )}
          {info && !error && (
            <div className="p-3 rounded-xl bg-emerald-500/10 text-sm text-emerald-300 border border-emerald-500/20">
              {info}
            </div>
          )}

          {step === 'phone' ? (
            <FormField label="Telefone (com DDD)">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 11 99999-9999"
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </FormField>
          ) : (
            <FormField label="Código de 6 dígitos">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
              />
            </FormField>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:text-gray-400 text-white font-medium rounded-xl transition-colors"
          >
            {loading
              ? 'Aguarde...'
              : step === 'phone'
                ? 'Enviar código'
                : 'Entrar'}
          </button>

          {step === 'code' && (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="w-full text-sm text-emerald-400 hover:underline disabled:text-gray-500"
            >
              Reenviar código
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
