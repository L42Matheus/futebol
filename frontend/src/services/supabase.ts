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
      detectSessionInUrl: true,
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
