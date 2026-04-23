import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react'
import api from '../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao enviar e-mail. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/gemini-svg.png" alt="Fynx" className="w-100% h-100% object-contain mx-auto mb-3" />
          </div>
          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">E-mail enviado!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Enviamos um link para redefinir a senha para:
            </p>
            <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-6">{email}</p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-left mb-6">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Clique no link do e-mail para criar uma nova senha. Verifique também a caixa de spam.
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/gemini-svg.png" alt="Fynx" className="w-100% h-100% object-contain mx-auto mb-3" />
        </div>

        <div className="card">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao login
          </Link>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Esqueci minha senha</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="seu@email.com"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}