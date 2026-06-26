import { authApi, setAuthToken } from './api'
import type { User, AuthResponse } from '../types'
import { getSupabaseClient } from './supabase'

const TOKEN_KEY = 'auth_token'
const SESSION_KEY = 'session_id'
const USER_CACHE_KEY = 'cached_user'
const AUTH_PROVIDER_KEY = 'auth_provider'
const APP_ROLE_KEY = 'app_role'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number }
    if (!payload.exp) return false
    return payload.exp * 1000 <= Date.now()
  } catch {
    return false
  }
}

// Cache em memória
let userCache: User | null = null
let userCacheTime = 0

function saveSession(token: string, user?: User, provider = 'backend'): void {
  const sessionId = generateSessionId()
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(SESSION_KEY, sessionId)
  localStorage.setItem(AUTH_PROVIDER_KEY, provider)
  if (user?.role) localStorage.setItem(APP_ROLE_KEY, user.role)
  if (user) {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }))
    userCache = user
    userCacheTime = Date.now()
  }
  setAuthToken(token)
}

function toAppUser(user: { email?: string; user_metadata?: Record<string, unknown> }): User {
  const metadata = user.user_metadata ?? {}
  const email = user.email ?? ''
  const nome =
    (typeof metadata['full_name'] === 'string' && metadata['full_name']) ||
    (typeof metadata['name'] === 'string' && metadata['name']) ||
    email.split('@')[0] ||
    'Usuário'
  const pendingRole = localStorage.getItem('pending_login_role')
  const selectedRole = localStorage.getItem(APP_ROLE_KEY)

  return {
    // O ID numérico passa a vir do perfil do Supabase na migração completa.
    id: 0,
    nome,
    email,
    role: pendingRole === 'admin' || selectedRole === 'admin' ? 'admin' : 'atleta',
  }
}

const authService = {
  async login(identificador: string, senha: string): Promise<AuthResponse> {
    const response = await authApi.login({ identificador, senha })
    saveSession(response.data.access_token, response.data.user)
    return response.data
  },

  async register(
    email: string,
    telefone: string,
    senha: string,
    nome = '',
    invite_token = '',
    role = 'atleta',
  ): Promise<AuthResponse> {
    const payload: Record<string, unknown> = { nome, email, telefone, senha, role }
    if (invite_token) payload['invite_token'] = invite_token
    const response = await authApi.register(payload)
    saveSession(response.data.access_token, response.data.user)
    return response.data
  },

  async loginWithGoogle(
    code: string,
    redirectUri: string,
    inviteToken?: string | null,
  ): Promise<AuthResponse> {
    const payload: Record<string, unknown> = { code, redirect_uri: redirectUri }
    if (inviteToken) payload['invite_token'] = inviteToken
    const response = await authApi.googleAuth(payload)
    saveSession(response.data.access_token, response.data.user)
    return response.data
  },

  async getGoogleAuthUrl(redirectUri: string, state?: string | null): Promise<string> {
    const response = await authApi.getGoogleUrl(redirectUri, state)
    return response.data.url
  },

  async loginWithSupabaseAccessToken(
    accessToken: string,
    options: { inviteToken?: string | null; role?: string } = {},
  ): Promise<User> {
    const response = await authApi.supabaseExchange({
      access_token: accessToken,
      invite_token: options.inviteToken || undefined,
      role: options.role || 'atleta',
    })
    saveSession(response.data.access_token, response.data.user)
    return response.data.user
  },

  async completeSupabaseGoogleLogin(): Promise<User | null> {
    // Lê o access_token diretamente do hash da URL devolvido pelo Supabase no
    // fluxo implicit. Evita depender de supabase.auth.getSession() que chama
    // /auth/v1/user e falha quando a apikey publishable não é aceita.
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    if (!accessToken) return null

    const pendingInvite = localStorage.getItem('pending_invite_token')
    const pendingRole = localStorage.getItem('pending_login_role') || 'atleta'

    const response = await authApi.supabaseExchange({
      access_token: accessToken,
      invite_token: pendingInvite || undefined,
      role: pendingRole,
    })

    saveSession(response.data.access_token, response.data.user)
    window.history.replaceState({}, document.title, window.location.pathname)
    return response.data.user
  },

  async getCurrentUser(forceRefresh = false): Promise<User> {
    if (localStorage.getItem(AUTH_PROVIDER_KEY) === 'supabase') {
      const { data: { session } } = await getSupabaseClient().auth.getSession()
      if (!session?.user) throw new Error('Sessão do Supabase não encontrada')

      const appUser = toAppUser(session.user)
      saveSession(session.access_token, appUser, 'supabase')
      return appUser
    }

    // Tenta usar cache em memória primeiro
    if (!forceRefresh && userCache && Date.now() - userCacheTime < CACHE_DURATION) {
      return userCache
    }

    // Tenta usar cache do localStorage
    if (!forceRefresh) {
      const cached = localStorage.getItem(USER_CACHE_KEY)
      if (cached) {
        const { user, timestamp } = JSON.parse(cached) as { user: User; timestamp: number }
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
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }))
    userCache = user
    userCacheTime = Date.now()
    return user
  },

  logout(): void {
    if (localStorage.getItem(AUTH_PROVIDER_KEY) === 'supabase') {
      void getSupabaseClient().auth.signOut()
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(USER_CACHE_KEY)
    localStorage.removeItem(AUTH_PROVIDER_KEY)
    localStorage.removeItem(APP_ROLE_KEY)
    userCache = null
    userCacheTime = 0
    setAuthToken(null)
  },

  getSessionId(): string | null {
    return localStorage.getItem(SESSION_KEY)
  },

  isSessionValid(): boolean {
    const token = localStorage.getItem(TOKEN_KEY)
    const sessionId = localStorage.getItem(SESSION_KEY)
    if (!token || !sessionId) return false
    if (isJwtExpired(token)) {
      this.logout()
      return false
    }
    return true
  },

  clearCache(): void {
    localStorage.removeItem(USER_CACHE_KEY)
    userCache = null
    userCacheTime = 0
  },
}

export default authService
