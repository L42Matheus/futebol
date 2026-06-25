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

const SUPABASE_PROFILE_KEY = 'supabase_profile'
const SUPABASE_ARTILHARIA_KEY = 'supabase_artilharia'
const SUPABASE_PAGAMENTOS_KEY = 'supabase_pagamentos'
const SUPABASE_TEMPORADAS_KEY = 'supabase_temporadas'
const SUPABASE_TEAMS_KEY = 'supabase_teams'
const SUPABASE_TEAM_MEMBERS_KEY = 'supabase_team_members'
const SUPABASE_JOGO_PLACARES_KEY = 'supabase_jogo_placares'

function readSupabaseProfileCache(userId) {
  try {
    const raw = localStorage.getItem(SUPABASE_PROFILE_KEY)
    if (!raw) return {}

    const cache = JSON.parse(raw)
    return cache?.[userId] || {}
  } catch {
    return {}
  }
}

function writeSupabaseProfileCache(userId, profile) {
  const raw = localStorage.getItem(SUPABASE_PROFILE_KEY)
  const cache = raw ? JSON.parse(raw) : {}
  cache[userId] = profile
  localStorage.setItem(SUPABASE_PROFILE_KEY, JSON.stringify(cache))
}

function buildSupabaseProfile(user) {
  const metadata = user.user_metadata || {}
  const cachedProfile = readSupabaseProfileCache(user.id)
  const fallbackName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Atleta'

  return {
    id: user.id,
    user_id: user.id,
    email: user.email,
    nome: cachedProfile.nome || fallbackName,
    apelido: cachedProfile.apelido || metadata.name || '',
    telefone: cachedProfile.telefone || user.phone || '',
    posicao: cachedProfile.posicao || '',
    perna_boa: cachedProfile.perna_boa || '',
    numero_camisa: cachedProfile.numero_camisa || null,
    foto_url: cachedProfile.foto_url || metadata.avatar_url || metadata.picture || null,
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function readLocalCache(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeLocalCache(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function nextLocalId(items) {
  const ids = (items || []).map((item) => Number(item.id) || 0)
  return ids.length ? Math.max(...ids) + 1 : 1
}

function getLocalJogoPlacar(jogoId) {
  const placares = readLocalCache(SUPABASE_JOGO_PLACARES_KEY, {})
  return placares?.[jogoId] || {}
}

function withLocalJogoPlacar(jogo) {
  if (!jogo) return jogo
  return { ...jogo, ...getLocalJogoPlacar(jogo.id) }
}

function normalizePlacarPayload(data = {}) {
  const placarTimeA = Number(data.placar_time_a)
  const placarTimeB = Number(data.placar_time_b)
  const timeANome = data.time_a_nome?.trim?.() || 'Time A'
  const timeBNome = data.time_b_nome?.trim?.() || 'Time B'
  const vencedor =
    placarTimeA === placarTimeB ? 'empate' : placarTimeA > placarTimeB ? 'time_a' : 'time_b'

  return {
    time_a_nome: timeANome,
    time_b_nome: timeBNome,
    placar_time_a: placarTimeA,
    placar_time_b: placarTimeB,
    vencedor,
    finalizado: true,
    status: 'finalizado',
    updated_at: new Date().toISOString(),
  }
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
  getHistorico: (id) => {
    if (!isSupabaseConfigured()) return api.get(`/atletas/${id}/historico`)

    const pagamentos = readLocalCache(SUPABASE_PAGAMENTOS_KEY, {})
    return supabaseResponse({
      financeiro: {
        pagamento_confirmado_mes_atual: Boolean(pagamentos[id]?.confirmado),
      },
    })
  },
  addCartao: (id, tipo, payload = {}) => api.post(`/atletas/${id}/cartoes`, { tipo, ...payload }),
  removeCartao: (id, tipo) => api.post(`/atletas/${id}/cartoes/remover`, { tipo }),
  confirmarPagamento: (id, confirmado, payload = {}) => {
    if (!isSupabaseConfigured()) {
      return api.post(`/atletas/${id}/confirmar-pagamento`, { confirmado, ...payload })
    }

    const pagamentos = readLocalCache(SUPABASE_PAGAMENTOS_KEY, {})
    pagamentos[id] = { confirmado, ...payload, updated_at: new Date().toISOString() }
    writeLocalCache(SUPABASE_PAGAMENTOS_KEY, pagamentos)
    return supabaseResponse({ financeiro: { pagamento_confirmado_mes_atual: confirmado } })
  },
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
    return supabaseResponse((data || []).map((jogo) => withLocalJogoPlacar({ ...jogo, total_confirmados: 0 })))
  },

  async get(id) {
    if (!isSupabaseConfigured()) return api.get(`/jogos/${id}`)

    const { data, error } = await getSupabaseClient().from('jogos').select('*').eq('id', id).single()
    throwSupabaseError(error)
    return supabaseResponse(withLocalJogoPlacar({ ...data, total_confirmados: 0 }))
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

  async updatePlacar(id, data) {
    const payload = normalizePlacarPayload(data)

    if (!isSupabaseConfigured()) {
      return api.patch(`/jogos/${id}`, payload)
    }

    // MVP: enquanto a tabela de resultados não existe no Supabase, mantemos o
    // placar localmente para validar o fluxo visual sem quebrar a agenda.
    const placares = readLocalCache(SUPABASE_JOGO_PLACARES_KEY, {})
    placares[id] = { ...(placares[id] || {}), ...payload }
    writeLocalCache(SUPABASE_JOGO_PLACARES_KEY, placares)
    return supabaseResponse({ id: Number(id), ...payload })
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
  async getLista(jogoId) {
    if (!isSupabaseConfigured()) return api.get(`/jogos/${jogoId}/lista`)

    // A confirmação de presença ainda será migrada para o Supabase. Enquanto isso,
    // a tela pode renderizar sem tentar acessar o FastAPI desligado.
    return supabaseResponse({
      jogo_id: Number(jogoId),
      confirmados: [],
      recusados: [],
      pendentes: [],
      total_confirmados: 0,
      total_recusados: 0,
      total_pendentes: 0,
    })
  },
}

export const presencasApi = {
  confirmar: (jogoId, atletaId) => api.post(`/presencas/confirmar/${jogoId}/${atletaId}`),
  recusar: (jogoId, atletaId) => api.post(`/presencas/recusar/${jogoId}/${atletaId}`),
  update: (id, data) => api.patch(`/presencas/${id}`, data),
}

export const pagamentosApi = {
  list: (rachaId, params = {}) => {
    if (!isSupabaseConfigured()) return api.get(`/pagamentos/?racha_id=${rachaId}`, { params })
    return supabaseResponse([])
  },
  create: (data) => {
    if (!isSupabaseConfigured()) return api.post('/pagamentos/', data)
    return supabaseResponse({ ...data, id: crypto.randomUUID(), status: 'pendente' })
  },
  enviarComprovante: (id, url) => {
    if (!isSupabaseConfigured()) return api.patch(`/pagamentos/${id}/comprovante?comprovante_url=${encodeURIComponent(url)}`)
    return supabaseResponse({ id, comprovante_url: url, status: 'aguardando_aprovacao' })
  },
  aprovar: (id, adminId, aprovado, motivo = null) => {
    if (!isSupabaseConfigured()) return api.post(`/pagamentos/${id}/aprovar?admin_id=${adminId}`, { aprovado, motivo_rejeicao: motivo })
    return supabaseResponse({ id, admin_id: adminId, status: aprovado ? 'aprovado' : 'rejeitado', motivo_rejeicao: motivo })
  },
  getPendentes: (rachaId) => {
    if (!isSupabaseConfigured()) return api.get(`/pagamentos/pendentes/${rachaId}`)
    return supabaseResponse([])
  },
  gerarMensalidade: (rachaId, referencia) => {
    if (!isSupabaseConfigured()) return api.post(`/pagamentos/gerar-mensalidade/${rachaId}?referencia=${referencia}`)
    return supabaseResponse({ racha_id: Number(rachaId), referencia, cobrancas_criadas: 0 })
  },
}

export const temporadasApi = {
  async list(rachaId) {
    const temporadas = readLocalCache(SUPABASE_TEMPORADAS_KEY, [])
      .filter((temporada) => Number(temporada.racha_id) === Number(rachaId))
      .sort((a, b) => {
        if (a.ano !== b.ano) return Number(b.ano) - Number(a.ano)
        return Number(b.mes) - Number(a.mes)
      })

    return supabaseResponse(temporadas)
  },

  async getActive(rachaId) {
    const temporadas = (await temporadasApi.list(rachaId)).data
    const active = temporadas.find((temporada) => temporada.status === 'ativa') || temporadas[0] || null
    return supabaseResponse(active)
  },

  async create(data) {
    const temporadas = readLocalCache(SUPABASE_TEMPORADAS_KEY, [])
    const existingActiveIndex = temporadas.findIndex(
      (temporada) =>
        Number(temporada.racha_id) === Number(data.racha_id) &&
        temporada.status === 'ativa',
    )

    if (existingActiveIndex >= 0 && data.status === 'ativa') {
      temporadas[existingActiveIndex] = {
        ...temporadas[existingActiveIndex],
        status: 'encerrada',
        encerrada_em: new Date().toISOString(),
      }
    }

    const temporada = {
      id: nextLocalId(temporadas),
      racha_id: Number(data.racha_id),
      nome: data.nome,
      mes: Number(data.mes),
      ano: Number(data.ano),
      status: data.status || 'ativa',
      campeao_team_id: data.campeao_team_id || null,
      created_at: new Date().toISOString(),
    }

    temporadas.push(temporada)
    writeLocalCache(SUPABASE_TEMPORADAS_KEY, temporadas)
    return supabaseResponse(temporada)
  },

  async setCampeao(temporadaId, teamId) {
    const temporadas = readLocalCache(SUPABASE_TEMPORADAS_KEY, [])
    const updated = temporadas.map((temporada) =>
      Number(temporada.id) === Number(temporadaId)
        ? { ...temporada, campeao_team_id: Number(teamId), status: 'encerrada' }
        : temporada,
    )
    writeLocalCache(SUPABASE_TEMPORADAS_KEY, updated)
    return supabaseResponse(updated.find((temporada) => Number(temporada.id) === Number(temporadaId)))
  },
}

export const teamsApi = {
  list: (rachaId, temporadaId = null) => {
    if (!isSupabaseConfigured()) return api.get(`/teams/?racha_id=${rachaId}`)

    const teams = readLocalCache(SUPABASE_TEAMS_KEY, [])
      .filter((team) => Number(team.racha_id) === Number(rachaId))
      .filter((team) => !temporadaId || Number(team.temporada_id) === Number(temporadaId))
    const members = readLocalCache(SUPABASE_TEAM_MEMBERS_KEY, [])

    return supabaseResponse(teams.map((team) => ({
      ...team,
      membros: members.filter((member) => Number(member.team_id) === Number(team.id)),
    })))
  },
  get: (teamId) => {
    if (!isSupabaseConfigured()) return api.get(`/teams/${teamId}`)

    const teams = readLocalCache(SUPABASE_TEAMS_KEY, [])
    const members = readLocalCache(SUPABASE_TEAM_MEMBERS_KEY, [])
    const team = teams.find((item) => Number(item.id) === Number(teamId))
    return supabaseResponse(team ? {
      ...team,
      membros: members.filter((member) => Number(member.team_id) === Number(teamId)),
    } : null)
  },
  create: (data) => {
    if (!isSupabaseConfigured()) return api.post('/teams/', data)

    const teams = readLocalCache(SUPABASE_TEAMS_KEY, [])
    const team = {
      id: nextLocalId(teams),
      racha_id: Number(data.racha_id),
      temporada_id: data.temporada_id ? Number(data.temporada_id) : null,
      nome: data.nome,
      cor: data.cor || null,
      created_at: new Date().toISOString(),
    }
    teams.push(team)
    writeLocalCache(SUPABASE_TEAMS_KEY, teams)
    return supabaseResponse(team)
  },
  update: (teamId, data) => {
    if (!isSupabaseConfigured()) return api.patch(`/teams/${teamId}`, data)

    const teams = readLocalCache(SUPABASE_TEAMS_KEY, [])
    const updated = teams.map((team) => Number(team.id) === Number(teamId) ? { ...team, ...data } : team)
    writeLocalCache(SUPABASE_TEAMS_KEY, updated)
    return supabaseResponse(updated.find((team) => Number(team.id) === Number(teamId)))
  },
  remove: (teamId) => {
    if (!isSupabaseConfigured()) return api.delete(`/teams/${teamId}`)

    const teams = readLocalCache(SUPABASE_TEAMS_KEY, [])
    const members = readLocalCache(SUPABASE_TEAM_MEMBERS_KEY, [])
    writeLocalCache(SUPABASE_TEAMS_KEY, teams.filter((team) => Number(team.id) !== Number(teamId)))
    writeLocalCache(SUPABASE_TEAM_MEMBERS_KEY, members.filter((member) => Number(member.team_id) !== Number(teamId)))
    return supabaseResponse(null)
  },
  addMember: (teamId, atletaId, options = {}) => {
    if (!isSupabaseConfigured()) {
      return api.post(`/teams/${teamId}/members`, {
        atleta_id: atletaId,
        is_titular: options.is_titular,
        posicao_escalacao: options.posicao_escalacao
      })
    }

    const members = readLocalCache(SUPABASE_TEAM_MEMBERS_KEY, [])
    const alreadyExists = members.some(
      (member) => Number(member.team_id) === Number(teamId) && Number(member.atleta_id) === Number(atletaId),
    )

    if (alreadyExists) return supabaseResponse(null)

    const member = {
      id: nextLocalId(members),
      team_id: Number(teamId),
      atleta_id: Number(atletaId),
      is_titular: options.is_titular ?? true,
      posicao_escalacao: options.posicao_escalacao || null,
    }
    members.push(member)
    writeLocalCache(SUPABASE_TEAM_MEMBERS_KEY, members)
    return supabaseResponse(member)
  },
  updateMember: (teamId, atletaId, data) => {
    if (!isSupabaseConfigured()) return api.patch(`/teams/${teamId}/members/${atletaId}`, data)

    const members = readLocalCache(SUPABASE_TEAM_MEMBERS_KEY, [])
    const updated = members.map((member) =>
      Number(member.team_id) === Number(teamId) && Number(member.atleta_id) === Number(atletaId)
        ? { ...member, ...data }
        : member,
    )
    writeLocalCache(SUPABASE_TEAM_MEMBERS_KEY, updated)
    return supabaseResponse(updated.find((member) => Number(member.team_id) === Number(teamId) && Number(member.atleta_id) === Number(atletaId)))
  },
  removeMember: (teamId, atletaId) => {
    if (!isSupabaseConfigured()) return api.delete(`/teams/${teamId}/members/${atletaId}`)

    const members = readLocalCache(SUPABASE_TEAM_MEMBERS_KEY, [])
    writeLocalCache(
      SUPABASE_TEAM_MEMBERS_KEY,
      members.filter((member) => !(Number(member.team_id) === Number(teamId) && Number(member.atleta_id) === Number(atletaId))),
    )
    return supabaseResponse(null)
  },
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
  async list(rachaId) {
    if (!isSupabaseConfigured()) return api.get(`/artilharia/?racha_id=${rachaId}`)

    const atletasRes = await atletasApi.list(rachaId)
    const statsCache = readLocalCache(SUPABASE_ARTILHARIA_KEY, {})
    const rachaStats = statsCache[rachaId] || {}

    return supabaseResponse((atletasRes.data || []).map((atleta) => ({
      atleta_id: atleta.id,
      nome: atleta.nome,
      apelido: atleta.apelido,
      foto_url: atleta.foto_url,
      posicao: atleta.posicao,
      gols: rachaStats[atleta.id]?.gols || 0,
      assistencias: rachaStats[atleta.id]?.assistencias || 0,
    })))
  },
  update: (rachaId, atletaId, data) => {
    if (!isSupabaseConfigured()) return api.patch(`/artilharia/${atletaId}?racha_id=${rachaId}`, data)

    const statsCache = readLocalCache(SUPABASE_ARTILHARIA_KEY, {})
    statsCache[rachaId] = {
      ...(statsCache[rachaId] || {}),
      [atletaId]: {
        ...(statsCache[rachaId]?.[atletaId] || {}),
        ...data,
      },
    }
    writeLocalCache(SUPABASE_ARTILHARIA_KEY, statsCache)
    return supabaseResponse(statsCache[rachaId][atletaId])
  },
}

export const profileApi = {
  async me() {
    if (!isSupabaseConfigured()) return api.get('/profile/me')

    const user = await getSupabaseUser()
    return supabaseResponse(buildSupabaseProfile(user))
  },

  async update(data) {
    if (!isSupabaseConfigured()) return api.patch('/profile/me', data)

    const supabase = getSupabaseClient()
    const user = await getSupabaseUser()
    const currentProfile = buildSupabaseProfile(user)
    const updatedProfile = {
      ...currentProfile,
      ...data,
      numero_camisa: data.numero_camisa || null,
    }

    writeSupabaseProfileCache(user.id, updatedProfile)

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: updatedProfile.nome,
        name: updatedProfile.apelido || updatedProfile.nome,
        avatar_url: updatedProfile.foto_url,
      },
    })

    if (error) {
      console.warn('Não foi possível sincronizar metadata do perfil no Supabase:', error.message)
    }

    return supabaseResponse(updatedProfile)
  },

  async uploadFoto(file) {
    if (!isSupabaseConfigured()) {
      const formData = new FormData()
      formData.append('file', file)
      return api.post('/profile/me/foto', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }

    const user = await getSupabaseUser()
    const currentProfile = buildSupabaseProfile(user)
    const updatedProfile = {
      ...currentProfile,
      foto_url: await readFileAsDataUrl(file),
    }

    writeSupabaseProfileCache(user.id, updatedProfile)
    return supabaseResponse(updatedProfile)
  },

  removerFoto: async () => {
    if (!isSupabaseConfigured()) return api.delete('/profile/me/foto')

    const user = await getSupabaseUser()
    const currentProfile = buildSupabaseProfile(user)
    const updatedProfile = { ...currentProfile, foto_url: null }
    writeSupabaseProfileCache(user.id, updatedProfile)
    return supabaseResponse(updatedProfile)
  },
}

export default api
