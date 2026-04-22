import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { authAPI } from '../api'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

export default function ConfirmEmail() {
  const { confirmEmail } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))

    // Verifica erro vindo do Supabase
    const errorCode = queryParams.get('error_code') || hashParams.get('error_code')
    const errorDesc = queryParams.get('error_description') || hashParams.get('error_description')
    if (errorCode) {
      setStatus('error')
      setError(
        errorCode === 'otp_expired'
          ? 'O link de confirmação expirou. Crie sua conta novamente.'
          : errorDesc || 'Link inválido.'
      )
      return
    }

    // Formato novo: token_hash nos query params
    const tokenHash = queryParams.get('token_hash') || hashParams.get('token_hash')
    const type = queryParams.get('type') || hashParams.get('type')

    // Formato legado: access_token no hash
    const accessToken = hashParams.get('access_token')

    if (tokenHash && type) {
      confirmEmail(tokenHash, type).then((result) => {
        if (result.success) {
          setStatus('success')
          setTimeout(() => navigate('/dashboard'), 2500)
        } else {
          setStatus('error')
          setError(result.error)
        }
      })
    } else if (accessToken) {
      // Usa o authAPI (axios com proxy configurado)
      authAPI.confirmToken(accessToken).then((res) => {
        const data = res.data
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setStatus('success')
        setTimeout(() => navigate('/dashboard'), 2500)
      }).catch(() => {
        setStatus('error')
        setError('Erro ao confirmar conta.')
      })
    } else {
      setStatus('error')
      setError('Link de confirmação inválido.')
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/gemini-svg.png" alt="GastosApp" className="w-100% h-100% object-contain mx-auto mb-3" />
        </div>

        <div className="card text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <Loader className="w-12 h-12 text-primary-500 animate-spin" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Confirmando seu e-mail...
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aguarde um momento.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                E-mail confirmado! 🎉
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Redirecionando para o dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Link inválido ou expirado
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error}</p>
              <button onClick={() => navigate('/register')} className="btn-primary w-full">
                Criar conta novamente
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}