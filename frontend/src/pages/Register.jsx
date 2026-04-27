import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { Mail, CheckCircle, Eye, EyeOff } from 'lucide-react'

export default function Register() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [pendingEmail, setPendingEmail] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    const result = await register(form.name, form.email, form.password)
    if (!result.success) {
      setError(result.error)
    } else if (result.confirmed) {
      navigate('/dashboard')
    } else {
      setPendingEmail(result.email)
    }
  }

  // ── Tela de aguardar confirmação ──────────────────────
  if (pendingEmail) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img
              src="/gemini-svg.png"
              alt="Planilha de Gastos"
              className="w-100% h-100% object-contain mx-auto mb-3"
            />
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Verifique seu e-mail
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Enviamos um link de confirmação para:
            </p>
            <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-6">
              {pendingEmail}
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-left mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Clique no botão do e-mail para ativar sua conta. Verifique também a caixa de spam.
                </p>
              </div>
            </div>

            <Link to="/login" className="btn-secondary w-full block text-center">
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulário de cadastro ────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/gemini-svg.png"
            alt="Planilha de Gastos"
            className="w-100% h-100% object-contain mx-auto mb-3"
          />
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Criar conta</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="Seu nome"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pr-10"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirmar senha</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="input-field pr-10"
                  placeholder="Repita a senha"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">As senhas não coincidem.</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}