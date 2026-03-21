import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { formatDateBR } from '../utils/formatters'
import type {
  Racha,
  Atleta,
  Jogo,
  JogoLista,
  Pagamento,
  Saldo,
  Profile,
  Team,
  AuthResponse,
  InviteToken,
  AtletaHistorico,
} from '../types'

const API_URL = import.meta.env?.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

export function setAuthToken(token: string | null): void {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

const storedToken =
  typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
if (storedToken) setAuthToken(storedToken)

// ─── Payload normalization ────────────────────────────────────────────────────

interface JogoPayload {
  data_hora?: Date | string
  valor_campo?: number | string | null
  [key: string]: unknown
}

export function normalizeJogoPayload(data: JogoPayload): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...data }
  if (payload['data_hora']) payload['data_hora'] = formatDateBR(payload['data_hora'] as Date | string)
  if (payload['valor_campo'] === '' || payload['valor_campo'] === null) {
    delete payload['valor_campo']
  }
  return payload
}

// ─── API modules ──────────────────────────────────────────────────────────────

export const rachasApi = {
  list: (): Promise<AxiosResponse<Racha[]>> => api.get('/rachas/'),
  get: (id: number | string): Promise<AxiosResponse<Racha>> => api.get(`/rachas/${id}`),
  create: (data: Partial<Racha>): Promise<AxiosResponse<Racha>> => api.post('/rachas/', data),
  update: (id: number | string, data: Partial<Racha>): Promise<AxiosResponse<Racha>> =>
    api.patch(`/rachas/${id}`, data),
  delete: (id: number | string): Promise<AxiosResponse<void>> => api.delete(`/rachas/${id}`),
  getSaldo: (id: number | string): Promise<AxiosResponse<Saldo>> =>
    api.get(`/rachas/${id}/saldo`),
}

export const atletasApi = {
  list: (rachaId: number | string): Promise<AxiosResponse<Atleta[]>> =>
    api.get(`/atletas/?racha_id=${rachaId}`),
  get: (id: number | string): Promise<AxiosResponse<Atleta>> => api.get(`/atletas/${id}`),
  create: (data: Partial<Atleta> & { racha_id: number }): Promise<AxiosResponse<Atleta>> =>
    api.post('/atletas/', data),
  update: (id: number | string, data: Partial<Atleta>): Promise<AxiosResponse<Atleta>> =>
    api.patch(`/atletas/${id}`, data),
  delete: (id: number | string): Promise<AxiosResponse<void>> => api.delete(`/atletas/${id}`),
  getHistorico: (id: number | string): Promise<AxiosResponse<AtletaHistorico>> =>
    api.get(`/atletas/${id}/historico`),
  addCartao: (
    id: number | string,
    tipo: string,
    payload: Record<string, unknown> = {},
  ): Promise<AxiosResponse<unknown>> => api.post(`/atletas/${id}/cartoes`, { tipo, ...payload }),
  removeCartao: (id: number | string, tipo: string): Promise<AxiosResponse<unknown>> =>
    api.post(`/atletas/${id}/cartoes/remover`, { tipo }),
  confirmarPagamento: (
    id: number | string,
    confirmado: boolean,
    payload: Record<string, unknown> = {},
  ): Promise<AxiosResponse<unknown>> =>
    api.post(`/atletas/${id}/confirmar-pagamento`, { confirmado, ...payload }),
  uploadFoto: (id: number | string, file: File): Promise<AxiosResponse<Atleta>> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/atletas/${id}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  removerFoto: (id: number | string): Promise<AxiosResponse<void>> =>
    api.delete(`/atletas/${id}/foto`),
}

export const jogosApi = {
  list: (
    rachaId: number | string,
    apenasFuturos = true,
  ): Promise<AxiosResponse<Jogo[]>> =>
    api.get(`/jogos/?racha_id=${rachaId}&apenas_futuros=${apenasFuturos}`),
  get: (id: number | string): Promise<AxiosResponse<Jogo>> => api.get(`/jogos/${id}`),
  create: (data: JogoPayload): Promise<AxiosResponse<Jogo>> =>
    api.post('/jogos/', normalizeJogoPayload(data)),
  update: (id: number | string, data: JogoPayload): Promise<AxiosResponse<Jogo>> =>
    api.patch(`/jogos/${id}`, normalizeJogoPayload(data)),
  cancel: (id: number | string): Promise<AxiosResponse<void>> => api.delete(`/jogos/${id}`),
  getLista: (jogoId: number | string): Promise<AxiosResponse<JogoLista>> =>
    api.get(`/jogos/${jogoId}/lista`),
}

export const presencasApi = {
  confirmar: (
    jogoId: number | string,
    atletaId: number | string,
  ): Promise<AxiosResponse<unknown>> =>
    api.post(`/presencas/confirmar/${jogoId}/${atletaId}`),
  recusar: (
    jogoId: number | string,
    atletaId: number | string,
  ): Promise<AxiosResponse<unknown>> =>
    api.post(`/presencas/recusar/${jogoId}/${atletaId}`),
  update: (
    id: number | string,
    data: Record<string, unknown>,
  ): Promise<AxiosResponse<unknown>> => api.patch(`/presencas/${id}`, data),
}

export const pagamentosApi = {
  list: (
    rachaId: number | string,
    params: Record<string, unknown> = {},
  ): Promise<AxiosResponse<Pagamento[]>> =>
    api.get(`/pagamentos/?racha_id=${rachaId}`, { params }),
  create: (data: Record<string, unknown>): Promise<AxiosResponse<Pagamento>> =>
    api.post('/pagamentos/', data),
  enviarComprovante: (
    id: number | string,
    url: string,
  ): Promise<AxiosResponse<Pagamento>> =>
    api.patch(`/pagamentos/${id}/comprovante?comprovante_url=${encodeURIComponent(url)}`),
  aprovar: (
    id: number | string,
    adminId: number,
    aprovado: boolean,
    motivo: string | null = null,
  ): Promise<AxiosResponse<Pagamento>> =>
    api.post(`/pagamentos/${id}/aprovar?admin_id=${adminId}`, {
      aprovado,
      motivo_rejeicao: motivo,
    }),
  getPendentes: (rachaId: number | string): Promise<AxiosResponse<Pagamento[]>> =>
    api.get(`/pagamentos/pendentes/${rachaId}`),
  gerarMensalidade: (
    rachaId: number | string,
    referencia: string,
  ): Promise<AxiosResponse<unknown>> =>
    api.post(`/pagamentos/gerar-mensalidade/${rachaId}?referencia=${referencia}`),
}

export const teamsApi = {
  list: (rachaId: number | string): Promise<AxiosResponse<Team[]>> =>
    api.get(`/teams/?racha_id=${rachaId}`),
  get: (teamId: number | string): Promise<AxiosResponse<Team>> =>
    api.get(`/teams/${teamId}`),
  create: (data: Partial<Team>): Promise<AxiosResponse<Team>> => api.post('/teams/', data),
  update: (
    teamId: number | string,
    data: Partial<Team>,
  ): Promise<AxiosResponse<Team>> => api.patch(`/teams/${teamId}`, data),
  remove: (teamId: number | string): Promise<AxiosResponse<void>> =>
    api.delete(`/teams/${teamId}`),
  addMember: (
    teamId: number | string,
    atletaId: number | string,
    options: { is_titular?: boolean; posicao_escalacao?: string } = {},
  ): Promise<AxiosResponse<unknown>> =>
    api.post(`/teams/${teamId}/members`, {
      atleta_id: atletaId,
      is_titular: options.is_titular,
      posicao_escalacao: options.posicao_escalacao,
    }),
  updateMember: (
    teamId: number | string,
    atletaId: number | string,
    data: Record<string, unknown>,
  ): Promise<AxiosResponse<unknown>> =>
    api.patch(`/teams/${teamId}/members/${atletaId}`, data),
  removeMember: (
    teamId: number | string,
    atletaId: number | string,
  ): Promise<AxiosResponse<void>> => api.delete(`/teams/${teamId}/members/${atletaId}`),
}

export const authApi = {
  register: (data: Record<string, unknown>): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', data),
  login: (data: Record<string, unknown>): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', data),
  me: (): Promise<AxiosResponse<import('../types').User>> => api.get('/auth/me'),
  getInvite: (token: string): Promise<AxiosResponse<InviteToken>> =>
    api.get(`/auth/invites/${token}`),
  createInvite: (data: {
    racha_id: number
    role: string
  }): Promise<AxiosResponse<InviteToken>> => api.post('/auth/invites', data),
  acceptInvite: (token: string): Promise<AxiosResponse<unknown>> =>
    api.post('/auth/invites/accept', { token }),
  getGoogleUrl: (
    redirectUri: string,
    state?: string | null,
  ): Promise<AxiosResponse<{ url: string }>> =>
    api.get('/auth/google/url', { params: { redirect_uri: redirectUri, state } }),
  googleAuth: (data: Record<string, unknown>): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/google', data),
  forgotPassword: (email: string): Promise<AxiosResponse<unknown>> =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (
    token: string,
    newPassword: string,
  ): Promise<AxiosResponse<unknown>> =>
    api.post('/auth/reset-password', { token, new_password: newPassword }),
}

export const artilhariaApi = {
  list: (rachaId: number | string): Promise<AxiosResponse<unknown[]>> =>
    api.get(`/artilharia/?racha_id=${rachaId}`),
  update: (
    rachaId: number | string,
    atletaId: number | string,
    data: Record<string, unknown>,
  ): Promise<AxiosResponse<unknown>> =>
    api.patch(`/artilharia/${atletaId}?racha_id=${rachaId}`, data),
}

export const profileApi = {
  me: (): Promise<AxiosResponse<Profile>> => api.get('/profile/me'),
  update: (data: Partial<Profile>): Promise<AxiosResponse<Profile>> =>
    api.patch('/profile/me', data),
  uploadFoto: (file: File): Promise<AxiosResponse<Profile>> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/profile/me/foto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  removerFoto: (): Promise<AxiosResponse<void>> => api.delete('/profile/me/foto'),
}

export default api
