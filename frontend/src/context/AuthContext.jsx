import React, { createContext, useState, useEffect, useContext, useCallback } from 'react'
import authService from '../services/auth'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState(null)

  // Carrega usuário na inicialização
  useEffect(() => {
    const loadUser = async () => {
      // Verifica se há sessão válida
      if (!authService.isSessionValid()) {
        setLoading(false)
        return
      }

      try {
        const currentUser = await authService.getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
          setIsAuthenticated(true)
          setSessionId(authService.getSessionId())
        }
      } catch (error) {
        console.error('Falha ao carregar usuário:', error)
        authService.logout()
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = useCallback(async (identificador, senha) => {
    setLoading(true)
    try {
      const response = await authService.login(identificador, senha)
      const currentUser = response.user || await authService.getCurrentUser()
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

  const register = useCallback(async (email, phone, password, nome = '', inviteToken = '', role = 'atleta') => {
    setLoading(true)
    try {
      const response = await authService.register(email, phone, password, nome, inviteToken, role)
      const currentUser = response.user || await authService.getCurrentUser()
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
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    setIsAuthenticated(false)
    setSessionId(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser(true) // força refresh
      setUser(currentUser)
      return currentUser
    } catch (error) {
      console.error('Falha ao atualizar usuário:', error)
      throw error
    }
  }, [])

  const value = {
    user,
    isAuthenticated,
    loading,
    sessionId,
    login,
    logout,
    register,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
