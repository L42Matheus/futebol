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

  client ??= createClient(supabaseUrl, supabasePublishableKey)
  return client
}

/**
 * Inicia o OAuth com Google pelo Supabase.
 *
 * Ainda não é usado pelo login atual: a troca só deve ser ativada depois que a
 * API aceitar e validar os JWTs emitidos pelo Supabase.
 */
export async function signInWithGoogleViaSupabase(redirectTo: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })

  if (error) throw error
}
