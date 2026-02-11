import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export const rachasApi = {
  list: () => api.get('/rachas'),
  get: (id) => api.get(`/rachas/${id}`),
  create: (data) => api.post('/rachas', data),
  update: (id, data) => api.patch(`/rachas/${id}`, data),
  delete: (id) => api.delete(`/rachas/${id}`),
  getSaldo: (id) => api.get(`/rachas/${id}/saldo`),
}

export const atletasApi = {
  list: (rachaId) => api.get(`/atletas?racha_id=${rachaId}`),
  get: (id) => api.get(`/atletas/${id}`),
  create: (data) => api.post('/atletas', data),
  update: (id, data) => api.patch(`/atletas/${id}`, data),
  delete: (id) => api.delete(`/atletas/${id}`),
  getHistorico: (id) => api.get(`/atletas/${id}/historico`),
}

export const jogosApi = {
  list: (rachaId, apenasFuturos = true) => api.get(`/jogos?racha_id=${rachaId}&apenas_futuros=${apenasFuturos}`),
  get: (id) => api.get(`/jogos/${id}`),
  create: (data) => api.post('/jogos', data),
  update: (id, data) => api.patch(`/jogos/${id}`, data),
  cancel: (id) => api.delete(`/jogos/${id}`),
  getLista: (id) => api.get(`/jogos/${id}/lista`),
}

export const presencasApi = {
  confirmar: (jogoId, atletaId) => api.post(`/presencas/confirmar/${jogoId}/${atletaId}`),
  recusar: (jogoId, atletaId) => api.post(`/presencas/recusar/${jogoId}/${atletaId}`),
  update: (id, data) => api.patch(`/presencas/${id}`, data),
}

export const pagamentosApi = {
  list: (rachaId, params = {}) => api.get(`/pagamentos?racha_id=${rachaId}`, { params }),
  create: (data) => api.post('/pagamentos', data),
  enviarComprovante: (id, url) => api.patch(`/pagamentos/${id}/comprovante?comprovante_url=${encodeURIComponent(url)}`),
  aprovar: (id, adminId, aprovado, motivo = null) => api.post(`/pagamentos/${id}/aprovar?admin_id=${adminId}`, { aprovado, motivo_rejeicao: motivo }),
  getPendentes: (rachaId) => api.get(`/pagamentos/pendentes/${rachaId}`),
  gerarMensalidade: (rachaId, referencia) => api.post(`/pagamentos/gerar-mensalidade/${rachaId}?referencia=${referencia}`),
}

export default api
