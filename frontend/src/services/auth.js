import { authApi, setAuthToken } from './api.js'
import { getSupabaseClient } from './supabase'

const TOKEN_KEY = 'auth_token'
const SESSION_KEY = 'session_id'
const USER_CACHE_KEY = 'cached_user'
const AUTH_PROVIDER_KEY = 'auth_provider'
const APP_ROLE_KEY = 'app_role'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Gera um ID de sessÃ£o Ãºnico
function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

function saveSession(token, user, provider = 'backend') {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(SESSION_KEY, generateSessionId())
  localStorage.setItem(AUTH_PROVIDER_KEY, provider)
  if (user?.role) localStorage.setItem(APP_ROLE_KEY, user.role)
  if (user) {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }))
    userCache = user
    userCacheTime = Date.now()
  }
  setAuthToken(token)
}

function toAppUser(user) {
  const metadata = user.user_metadata || {}
  const email = user.email || ''
  const nome = metadata.full_name || metadata.name || email.split('@')[0] || 'Usuário'
  const pendingRole = localStorage.getItem('pending_login_role')
  const selectedRole = localStorage.getItem(APP_ROLE_KEY)

  return {
    id: 0,
    nome,
    email,
    role: pendingRole === 'admin' || selectedRole === 'admin' ? 'admin' : 'atleta',
  }
}

// Cache do usuÃ¡rio em memÃ³ria
let userCache = null
let userCacheTime = 0

function canUseCachedUser(user) {
  return Boolean(user)
}

const authService = {
  async login(identificador, senha) {
    const response = await authApi.login({ identificador, senha })
    const token = response.data.access_token
    const user = response.data.user

    // Salva token e sessionId
    const sessionId = generateSessionId()
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(SESSION_KEY, sessionId)

    // Cache do usuÃ¡rio
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

    // Cache do usuÃ¡rio
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }))
      userCache = user
      userCacheTime = Date.now()
    }

    setAuthToken(token)
    return response.data
  },

  async loginWithGoogle(code, redirectUri, inviteToken = null, role = 'atleta') {
    const payload = { code, redirect_uri: redirectUri, role }
    if (inviteToken) payload.invite_token = inviteToken
    const response = await authApi.googleAuth(payload)
    const token = response.data.access_token
    const user = response.data.user

    const sessionId = generateSessionId()
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(SESSION_KEY, sessionId)

    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }))
      userCache = user
      userCacheTime = Date.now()
    }

    setAuthToken(token)
    return response.data
  },

  async getGoogleAuthUrl(redirectUri, state = null) {
    const response = await authApi.getGoogleUrl(redirectUri, state)
    return response.data.url
  },

  async completeSupabaseGoogleLogin() {
    const supabase = getSupabaseClient()
    let { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      const code = new URL(window.location.href).searchParams.get('code')
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) throw error
        session = data.session
      }
    }

    if (!session?.user) return null

    const user = toAppUser(session.user)
    saveSession(session.access_token, user, 'supabase')
    window.history.replaceState({}, document.title, window.location.pathname)
    return user
  },

  async getCurrentUser(forceRefresh = false) {
    if (localStorage.getItem(AUTH_PROVIDER_KEY) === 'supabase') {
      const { data: { session } } = await getSupabaseClient().auth.getSession()
      if (!session?.user) throw new Error('Sessão do Supabase não encontrada')

      const user = toAppUser(session.user)
      saveSession(session.access_token, user, 'supabase')
      return user
    }

    // Tenta usar cache em memÃ³ria primeiro
    if (
      !forceRefresh &&
      canUseCachedUser(userCache) &&
      Date.now() - userCacheTime < CACHE_DURATION
    ) {
      return userCache
    }

    // Tenta usar cache do localStorage
    if (!forceRefresh) {
      const cached = localStorage.getItem(USER_CACHE_KEY)
      if (cached) {
        const { user, timestamp } = JSON.parse(cached)
        if (canUseCachedUser(user) && Date.now() - timestamp < CACHE_DURATION) {
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
    if (localStorage.getItem(AUTH_PROVIDER_KEY) === 'supabase') {
      void getSupabaseClient().auth.signOut()
    }
    // Limpa todos os dados de sessÃ£o
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(USER_CACHE_KEY)
    localStorage.removeItem(AUTH_PROVIDER_KEY)
    localStorage.removeItem(APP_ROLE_KEY)

    // Limpa cache em memÃ³ria
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
