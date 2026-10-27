import { authApi } from './api'

// Mesma chave que a Home usa para lembrar o racha aberto.
export const SELECTED_RACHA_KEY = 'quemjogafc:selected_racha_id'

// Entra no racha do convite com a conta já logada e deixa esse racha aberto na Home.
// Sem isso, quem já participa de um racha nunca entraria no segundo.
export async function aceitarConvite(token: string): Promise<boolean> {
  try {
    const res = await authApi.acceptInvite(token)
    try {
      localStorage.setItem(SELECTED_RACHA_KEY, String(res.data.racha_id))
    } catch {
      // sem storage a Home abre o primeiro racha
    }
    return true
  } catch {
    return false
  }
}
