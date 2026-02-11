import { authApi, setAuthToken } from './api'

const TOKEN_KEY = 'auth_token'

const authService = {
  async login(identificador, senha) {
    const response = await authApi.login({ identificador, senha })
    const token = response.data.access_token
    localStorage.setItem(TOKEN_KEY, token)
    setAuthToken(token)
    return response.data
  },
  async register(email, telefone, senha, nome = '', invite_token = '') {
    const payload = { nome, email, telefone, senha }
    if (invite_token) payload.invite_token = invite_token
    const response = await authApi.register(payload)
    const token = response.data.access_token
    localStorage.setItem(TOKEN_KEY, token)
    setAuthToken(token)
    return response.data
  },
  async getCurrentUser() {
    const response = await authApi.me()
    return response.data
  },
  logout() {
    localStorage.removeItem(TOKEN_KEY)
    setAuthToken(null)
  },
}

export default authService
