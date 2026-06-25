import axios from 'axios'
import { getSupabaseClient, isSupabaseConfigured } from './supabase'

const API_URL = import.meta.env?.VITE_API_URL || ''
const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
if (storedToken) setAuthToken(storedToken)

export function formatDateBR(value) {
  if (!value) return value
  if (value instanceof Date && !isNaN(value)) {
    const yyyy = value.getFullYear()
    const mm = String(value.getMonth() + 1).padStart(2, '0')
    const dd = String(value.getDate()).padStart(2, '0')
    const hh = String(value.getHours()).padStart(2, '0')
    const min = String(value.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:00`
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value
    if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return value
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return `${value}T00:00:00`
  }
  return value
}

export function normalizeJogoPayload(data) {
  const payload = { ...data }
  if (payload.data_hora) payload.data_hora = formatDateBR(payload.data_hora)
  if (payload.valor_campo === '' || payload.valor_campo === null) {
    delete payload.valor_campo
  }
  return payload
}

function supabaseResponse(data) {
  // Mantém o mesmo formato usado pelo Axios e evita mudanças nas telas.
  return { data }
}

function throwSupabaseError(error) {
  if (error) throw error
}

async function getSupabaseUser() {
  const { data, error } = await getSupabaseClient().auth.getUser()
  throwSupabaseError(error)
  if (!data.user) throw new Error('Sessão do Supabase não encontrada.')
  return data.user
}

function maxAtletasPorTipo(tipo) {
  return { campo: 40, society: 30, futsal: 20 }[tipo] || 30
}

export const rachasApi = {
  async list() {
    if (!isSupabaseConfigured()) return api.get('/rachas/')

    const supabase = getSupabaseClient()
    const user = await getSupabaseUser()
    const { data, error } = await supabase
      .from('rachas')
      .select('*, atletas(count)')
      .order('created_at', { ascending: false })
    throwSupabaseError(error)

    return supabaseResponse((data || []).map(({ atletas, ...racha }) => ({
      ...racha,
      total_atletas: atletas?.[0]?.count || 0,
      is_admin: racha.created_by === user.id,
    })))
  },

  async get(id) {
    if (!isSupabaseConfigured()) return api.get(`/rachas/${id}`)

    const { data, error } = await getSupabaseClient()
      .from('rachas')
      .select('*')
      .eq('id', id)
      .single()
    throwSupabaseError(error)
    return supabaseResponse(data)
  },

  async create(data) {
    if (!isSupabaseConfigured()) return api.post('/rachas/', data)

    const user = await getSupabaseUser()
    const payload = {
      nome: data.nome,
      tipo: data.tipo,
      valor_mensalidade: data.valor_mensalidade || 0,
      max_atletas: data.max_atletas || maxAtletasPorTipo(data.tipo),
      created_by: user.id,
    }
    const { data: racha, error } = await getSupabaseClient()
      .from('rachas')
      .insert(payload)
      .select()
      .single()
    throwSupabaseError(error)
    return supabaseResponse(racha)
  },

  async update(id, data) {
    if (!isSupabaseConfigured()) return api.patch(`/rachas/${id}`, data)

    const { data: racha, error } = await getSupabaseClient()
      .from('rachas')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    throwSupabaseError(error)
    return supabaseResponse(racha)
  },

  async delete(id) {
    if (!isSupabaseConfigured()) return api.delete(`/rachas/${id}`)

    const { error } = await getSupabaseClient().from('rachas').delete().eq('id', id)
    throwSupabaseError(error)
    return supabaseResponse(null)
  },

  async getSaldo(id) {
    if (!isSupabaseConfigured()) return api.get(`/rachas/${id}/saldo`)

    // A área financeira será migrada na próxima etapa. Retornar um estado neutro
    // impede que o painel volte a depender da API durante essa transição.
    return supabaseResponse({ racha_id: Number(id), pendente: 0, pendente_formatado: 'R$ 0,00' })
  },
}

export const atletasApi = {
  async list(rachaId) {
    if (!isSupabaseConfigured()) return api.get(`/atletas/?racha_id=${rachaId}`)

    const { data, error } = await getSupabaseClient()
      .from('atletas')
      .select('*')
      .eq('racha_id', rachaId)
      .eq('ativo', true)
      .order('nome')
    throwSupabaseError(error)
    return supabaseResponse(data || [])
  },

  async get(id) {
    if (!isSupabaseConfigured()) return api.get(`/atletas/${id}`)

    const { data, error } = await getSupabaseClient().from('atletas').select('*').eq('id', id).single()
    throwSupabaseError(error)
    return supabaseResponse(data)
  },

  async create(data) {
    if (!isSupabaseConfigured()) return api.post('/atletas/', data)

    const payload = {
      racha_id: data.racha_id,
      nome: data.nome,
      apelido: data.apelido || null,
      telefone: data.telefone || null,
      posicao: data.posicao || 'meia',
      numero_camisa: data.numero_camisa || null,
      is_admin: Boolean(data.is_admin),
      ativo: true,
    }
    const { data: atleta, error } = await getSupabaseClient()
      .from('atletas')
      .insert(payload)
      .select()
      .single()
    throwSupabaseError(error)
    return supabaseResponse(atleta)
  },

  async update(id, data) {
    if (!isSupabaseConfigured()) return api.patch(`/atletas/${id}`, data)

    const { data: atleta, error } = await getSupabaseClient()
      .from('atletas')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    throwSupabaseError(error)
    return supabaseResponse(atleta)
  },

  async delete(id) {
    if (!isSupabaseConfigured()) return api.delete(`/atletas/${id}`)

    const { error } = await getSupabaseClient().from('atletas').delete().eq('id', id)
    throwSupabaseError(error)
    return supabaseResponse(null)
  },
  getHistorico: (id) => api.get(`/atletas/${id}/historico`),
  addCartao: (id, tipo, payload = {}) => api.post(`/atletas/${id}/cartoes`, { tipo, ...payload }),
  removeCartao: (id, tipo) => api.post(`/atletas/${id}/cartoes/remover`, { tipo }),
  confirmarPagamento: (id, confirmado, payload = {}) => api.post(`/atletas/${id}/confirmar-pagamento`, { confirmado, ...payload }),
  uploadFoto: (id, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/atletas/${id}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  removerFoto: (id) => api.delete(`/atletas/${id}/foto`),
}

export const jogosApi = {
  async list(rachaId, apenasFuturos = true) {
    if (!isSupabaseConfigured()) return api.get(`/jogos/?racha_id=${rachaId}&apenas_futuros=${apenasFuturos}`)

    let query = getSupabaseClient()
      .from('jogos')
      .select('*')
      .eq('racha_id', rachaId)
      .eq('cancelado', false)
      .order('data_hora', { ascending: true })
    if (apenasFuturos) query = query.gte('data_hora', new Date().toISOString())

    const { data, error } = await query
    throwSupabaseError(error)
    return supabaseResponse((data || []).map((jogo) => ({ ...jogo, total_confirmados: 0 })))
  },

  async get(id) {
    if (!isSupabaseConfigured()) return api.get(`/jogos/${id}`)

    const { data, error } = await getSupabaseClient().from('jogos').select('*').eq('id', id).single()
    throwSupabaseError(error)
    return supabaseResponse({ ...data, total_confirmados: 0 })
  },

  async create(data) {
    if (!isSupabaseConfigured()) return api.post('/jogos/', normalizeJogoPayload(data))

    const payload = normalizeJogoPayload(data)
    const { data: jogo, error } = await getSupabaseClient().from('jogos').insert(payload).select().single()
    throwSupabaseError(error)
    return supabaseResponse(jogo)
  },

  async update(id, data) {
    if (!isSupabaseConfigured()) return api.patch(`/jogos/${id}`, normalizeJogoPayload(data))

    const { data: jogo, error } = await getSupabaseClient()
      .from('jogos')
      .update(normalizeJogoPayload(data))
      .eq('id', id)
      .select()
      .single()
    throwSupabaseError(error)
    return supabaseResponse(jogo)
  },

  async cancel(id) {
    if (!isSupabaseConfigured()) return api.delete(`/jogos/${id}`)

    const { data, error } = await getSupabaseClient()
      .from('jogos')
      .update({ cancelado: true })
      .eq('id', id)
      .select()
      .single()
    throwSupabaseError(error)
    return supabaseResponse(data)
  },
  getLista: (jogoId) => api.get(`/jogos/${jogoId}/lista`),
}

export const presencasApi = {
  confirmar: (jogoId, atletaId) => api.post(`/presencas/confirmar/${jogoId}/${atletaId}`),
  recusar: (jogoId, atletaId) => api.post(`/presencas/recusar/${jogoId}/${atletaId}`),
  update: (id, data) => api.patch(`/presencas/${id}`, data),
}

export const pagamentosApi = {
  list: (rachaId, params = {}) => api.get(`/pagamentos/?racha_id=${rachaId}`, { params }),
  create: (data) => api.post('/pagamentos/', data),
  enviarComprovante: (id, url) => api.patch(`/pagamentos/${id}/comprovante?comprovante_url=${encodeURIComponent(url)}`),
  aprovar: (id, adminId, aprovado, motivo = null) => api.post(`/pagamentos/${id}/aprovar?admin_id=${adminId}`, { aprovado, motivo_rejeicao: motivo }),
  getPendentes: (rachaId) => api.get(`/pagamentos/pendentes/${rachaId}`),
  gerarMensalidade: (rachaId, referencia) => api.post(`/pagamentos/gerar-mensalidade/${rachaId}?referencia=${referencia}`),
}

export const teamsApi = {
  list: (rachaId) => api.get(`/teams/?racha_id=${rachaId}`),
  get: (teamId) => api.get(`/teams/${teamId}`),
  create: (data) => api.post('/teams/', data),
  update: (teamId, data) => api.patch(`/teams/${teamId}`, data),
  remove: (teamId) => api.delete(`/teams/${teamId}`),
  addMember: (teamId, atletaId, options = {}) => api.post(`/teams/${teamId}/members`, {
    atleta_id: atletaId,
    is_titular: options.is_titular,
    posicao_escalacao: options.posicao_escalacao
  }),
  updateMember: (teamId, atletaId, data) => api.patch(`/teams/${teamId}/members/${atletaId}`, data),
  removeMember: (teamId, atletaId) => api.delete(`/teams/${teamId}/members/${atletaId}`),
}

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  getInvite: (token) => api.get(`/auth/invites/${token}`),
  async createInvite(data) {
    if (!isSupabaseConfigured()) return api.post('/auth/invites', data)

    const user = await getSupabaseUser()
    const invite = {
      racha_id: data.racha_id,
      role: data.role,
      token: crypto.randomUUID(),
      criado_por_user_id: user.id,
    }
    const { data: createdInvite, error } = await getSupabaseClient()
      .from('invites')
      .insert(invite)
      .select()
      .single()
    throwSupabaseError(error)
    return supabaseResponse(createdInvite)
  },
  acceptInvite: (token) => api.post('/auth/invites/accept', { token }),
  getGoogleUrl: (redirectUri, state) => api.get('/auth/google/url', { params: { redirect_uri: redirectUri, state } }),
  googleAuth: (data) => api.post('/auth/google', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, new_password: newPassword }),
}

export const artilhariaApi = {
  list: (rachaId) => api.get(`/artilharia/?racha_id=${rachaId}`),
  update: (rachaId, atletaId, data) => api.patch(`/artilharia/${atletaId}?racha_id=${rachaId}`, data),
}

export const profileApi = {
  me: () => api.get('/profile/me'),
  update: (data) => api.patch('/profile/me', data),
  uploadFoto: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/profile/me/foto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  removerFoto: () => api.delete('/profile/me/foto'),
}

export default api
