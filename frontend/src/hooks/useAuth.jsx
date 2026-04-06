import { createContext, useContext, useState } from 'react'
import { authAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    setLoading(true)
    try {
      const res = await authAPI.login({ email, password })
      const { access_token, user: userData } = res.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Erro ao fazer login' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (name, email, password) => {
    setLoading(true)
    try {
      const res = await authAPI.register({ name, email, password })
      // Se já veio com token (confirm email desativado), loga direto
      if (res.data.confirmed && res.data.access_token) {
        localStorage.setItem('token', res.data.access_token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        setUser(res.data.user)
        return { success: true, confirmed: true }
      }
      // Fluxo normal: aguardar confirmação de email
      return { success: true, confirmed: false, email: res.data.email }
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Erro ao criar conta' }
    } finally {
      setLoading(false)
    }
  }

  const confirmEmail = async (tokenHash, type) => {
    setLoading(true)
    try {
      const res = await authAPI.confirmEmail(tokenHash, type)
      const { access_token, user: userData } = res.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Link inválido ou expirado' }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try { await authAPI.logout() } catch { /* ignore */ }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, confirmEmail, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}