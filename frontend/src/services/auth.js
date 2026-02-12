import { authApi, setAuthToken } from './api'

const TOKEN_KEY = 'auth_token'
const SESSION_KEY = 'session_id'
const USER_CACHE_KEY = 'cached_user'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Gera um ID de sessão único
function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// Cache do usuário em memória
let userCache = null
let userCacheTime = 0

const authService = {
  async login(identificador, senha) {
    const response = await authApi.login({ identificador, senha })
    const token = response.data.access_token
    const user = response.data.user

    // Salva token e sessionId
    const sessionId = generateSessionId()
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(SESSION_KEY, sessionId)

    // Cache do usuário
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }))
      userCache = user
      userCacheTime = Date.now()
    }

    setAuthToken(token)
    return response.data
  },

  async register(email, telefone, senha, nome = '', invite_token = '', role = 'atleta') {
    const payload = { nome, email, telefone, senha, role }
    if (invite_token) payload.invite_token = invite_token
    const response = await authApi.register(payload)
    const token = response.data.access_token
    const user = response.data.user

    // Salva token e sessionId
    const sessionId = generateSessionId()
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(SESSION_KEY, sessionId)

    // Cache do usuário
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }))
      userCache = user
      userCacheTime = Date.now()
    }

    setAuthToken(token)
    return response.data
  },

  async getCurrentUser(forceRefresh = false) {
    // Tenta usar cache em memória primeiro
    if (!forceRefresh && userCache && Date.now() - userCacheTime < CACHE_DURATION) {
      return userCache
    }

    // Tenta usar cache do localStorage
    if (!forceRefresh) {
      const cached = localStorage.getItem(USER_CACHE_KEY)
      if (cached) {
        const { user, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_DURATION) {
          userCache = user
          userCacheTime = timestamp
          return user
        }
      }
    }

    // Busca do servidor
    const response = await authApi.me()
    const user = response.data

    // Atualiza cache
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }))
    userCache = user
    userCacheTime = Date.now()

    return user
  },

  logout() {
    // Limpa todos os dados de sessão
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(USER_CACHE_KEY)

    // Limpa cache em memória
    userCache = null
    userCacheTime = 0

    setAuthToken(null)
  },

  getSessionId() {
    return localStorage.getItem(SESSION_KEY)
  },

  isSessionValid() {
    return Boolean(localStorage.getItem(TOKEN_KEY) && localStorage.getItem(SESSION_KEY))
  },

  clearCache() {
    localStorage.removeItem(USER_CACHE_KEY)
    userCache = null
    userCacheTime = 0
  },
}

export default authService
