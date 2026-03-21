/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext, useCallback } from 'react'
import type { ReactNode } from 'react'
import authService from '../services/auth'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  sessionId: string | null
  login: (identificador: string, senha: string) => Promise<boolean>
  logout: () => void
  register: (
    email: string,
    phone: string,
    password: string,
    nome?: string,
    inviteToken?: string,
    role?: string,
  ) => Promise<boolean>
  refreshUser: () => Promise<User>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      if (!authService.isSessionValid()) {
        setLoading(false)
        return
      }
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
        setIsAuthenticated(true)
        setSessionId(authService.getSessionId())
      } catch (error) {
        console.error('Falha ao carregar usuário:', error)
        authService.logout()
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  const login = useCallback(async (identificador: string, senha: string): Promise<boolean> => {
    setLoading(true)
    try {
      const response = await authService.login(identificador, senha)
      const currentUser = response.user ?? (await authService.getCurrentUser())
      setUser(currentUser)
      setIsAuthenticated(true)
      setSessionId(authService.getSessionId())
      return true
    } catch (error) {
      console.error('Login falhou:', error)
      setIsAuthenticated(false)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(
    async (
      email: string,
      phone: string,
      password: string,
      nome = '',
      inviteToken = '',
      role = 'atleta',
    ): Promise<boolean> => {
      setLoading(true)
      try {
        const response = await authService.register(email, phone, password, nome, inviteToken, role)
        const currentUser = response.user ?? (await authService.getCurrentUser())
        setUser(currentUser)
        setIsAuthenticated(true)
        setSessionId(authService.getSessionId())
        return true
      } catch (error) {
        console.error('Registro falhou:', error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    setIsAuthenticated(false)
    setSessionId(null)
  }, [])

  const refreshUser = useCallback(async (): Promise<User> => {
    const currentUser = await authService.getCurrentUser(true)
    setUser(currentUser)
    return currentUser
  }, [])

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    loading,
    sessionId,
    login,
    logout,
    register,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
