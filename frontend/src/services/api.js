import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

const storedToken = localStorage.getItem('auth_token')
if (storedToken) setAuthToken(storedToken)

function formatDateBR(value) {
  if (!value) return value
  if (value instanceof Date && !isNaN(value)) {
    const dd = String(value.getDate()).padStart(2, '0')
    const mm = String(value.getMonth() + 1).padStart(2, '0')
    const yyyy = value.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }
  if (typeof value === 'string') {
    if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return value
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [yyyy, mm, dd] = value.split('T')[0].split('-')
      return `${dd}/${mm}/${yyyy}`
    }
  }
  return value
}

function normalizeJogoPayload(data) {
  const payload = { ...data }
  if (payload.data_hora) payload.data_hora = formatDateBR(payload.data_hora)
  if (payload.valor_campo === '' || payload.valor_campo === null) {
    delete payload.valor_campo
  }
  return payload
}

export const rachasApi = {
  list: () => api.get('/rachas/'),
  get: (id) => api.get(`/rachas/${id}`),
  create: (data) => api.post('/rachas/', data),
  update: (id, data) => api.patch(`/rachas/${id}`),
  delete: (id) => api.delete(`/rachas/${id}`),
  getSaldo: (id) => api.get(`/rachas/${id}/saldo`),
}

export const atletasApi = {
  list: (rachaId) => api.get(`/atletas/?racha_id=${rachaId}`),
  get: (id) => api.get(`/atletas/${id}`),
  create: (data) => api.post('/atletas/', data),
  update: (id, data) => api.patch(`/atletas/${id}`, data),
  delete: (id) => api.delete(`/atletas/${id}`),
  getHistorico: (id) => api.get(`/atletas/${id}/historico`),
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
  list: (rachaId, apenasFuturos = true) => api.get(`/jogos/?racha_id=${rachaId}&apenas_futuros=${apenasFuturos}`),
  get: (id) => api.get(`/jogos/${id}`),
  create: (data) => api.post('/jogos/', normalizeJogoPayload(data)),
  update: (id, data) => api.patch(`/jogos/${id}`, normalizeJogoPayload(data)),
  cancel: (id) => api.delete(`/jogos/${id}`),
  getLista: (id) => api.get(`/jogos/${id}/lista`),
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
  list: (rachaId) => api.get(`/teams?racha_id=${rachaId}`),
  get: (teamId) => api.get(`/teams/${teamId}`),
  create: (data) => api.post('/teams', data),
  update: (teamId, data) => api.patch(`/teams/${teamId}`, data),
  remove: (teamId) => api.delete(`/teams/${teamId}`),
  addMember: (teamId, atletaId) => api.post(`/teams/${teamId}/members`, { atleta_id: atletaId }),
  removeMember: (teamId, atletaId) => api.delete(`/teams/${teamId}/members/${atletaId}`),
}

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  getInvite: (token) => api.get(`/auth/invites/${token}`),
  createInvite: (data) => api.post('/auth/invites', data),
  acceptInvite: (token) => api.post('/auth/invites/accept', { token }),
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
