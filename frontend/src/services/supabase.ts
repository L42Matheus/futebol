import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

let client: SupabaseClient | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey)
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  client ??= createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      // Lemos o access_token do hash manualmente em completeSupabaseGoogleLogin.
      // Deixar o supabase-js processar dispara /auth/v1/user, que aqui sempre
      // dispara mesmo quando o backend já validou via JWKS.
      detectSessionInUrl: false,
      persistSession: false,
      flowType: 'implicit',
    },
  })
  return client
}

/**
 * Inicia o OAuth com Google pelo Supabase.
 *
 * O callback deve voltar para a tela de login, que finaliza a sessão local.
 */
export async function signInWithGoogleViaSupabase(redirectTo: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })

  if (error) throw error
}

/**
 * Envia um código OTP por SMS para o telefone informado.
 * O telefone deve estar em formato E.164 (ex: +5511999999999).
 */
export async function sendSmsOtp(phone: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: true },
  })
  if (error) throw error
}

/**
 * Valida o código OTP recebido por SMS e retorna o access_token Supabase.
 */
export async function verifySmsOtp(phone: string, code: string): Promise<string> {
  const { data, error } = await getSupabaseClient().auth.verifyOtp({
    phone,
    token: code,
    type: 'sms',
  })
  if (error) throw error
  if (!data.session?.access_token) {
    throw new Error('Sessão Supabase não retornou access_token')
  }
  return data.session.access_token
}
