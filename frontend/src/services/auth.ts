import { authApi, setAuthToken } from './api'
import type { User, AuthResponse } from '../types'

const TOKEN_KEY = 'auth_token'
const SESSION_KEY = 'session_id'
const USER_CACHE_KEY = 'cached_user'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// Cache em memória
let userCache: User | null = null
let userCacheTime = 0

function saveSession(token: string, user?: User): void {
  const sessionId = generateSessionId()
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(SESSION_KEY, sessionId)
  if (user) {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }))
    userCache = user
    userCacheTime = Date.now()
  }
  setAuthToken(token)
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

  async getCurrentUser(forceRefresh = false): Promise<User> {
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
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(USER_CACHE_KEY)
    userCache = null
    userCacheTime = 0
    setAuthToken(null)
  },

  getSessionId(): string | null {
    return localStorage.getItem(SESSION_KEY)
  },

  isSessionValid(): boolean {
    return Boolean(localStorage.getItem(TOKEN_KEY) && localStorage.getItem(SESSION_KEY))
  },

  clearCache(): void {
    localStorage.removeItem(USER_CACHE_KEY)
    userCache = null
    userCacheTime = 0
  },
}

export default authService
