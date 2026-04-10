import { useState, useEffect } from 'react'
import { User, Mail, Save, CheckCircle, MessageCircle, Phone, AlertCircle, Loader2, Trash2, Lock } from 'lucide-react'
import { authAPI } from '../api'
import api from '../api'
import { useAuth } from '../hooks/useAuth.jsx'
import { usePlan } from '../hooks/usePlan'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const { user, setUser } = useAuth()
  const { canUseWhatsapp } = usePlan()
  const navigate = useNavigate()

  // ── Perfil ────────────────────────────────────────────
  const [name, setName]       = useState(user?.name || '')
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  // ── WhatsApp ──────────────────────────────────────────
  const [phone, setPhone]           = useState('')
  const [savedPhone, setSavedPhone] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneFetching, setPhoneFetching] = useState(true)
  const [phoneSuccess, setPhoneSuccess] = useState(false)
  const [phoneError, setPhoneError]   = useState('')

  const initials = name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        if (res.data.phone) {
          setSavedPhone(res.data.phone)
          setPhone(res.data.phone)
        }
      })
      .catch(() => {})
      .finally(() => setPhoneFetching(false))
  }, [])

  const handleSave = async () => {
    setError('')
    setSuccess(false)
    const trimmed = name.trim()
    if (!trimmed) return setError('O nome não pode ser vazio')

    setSaving(true)
    try {
      const res = await authAPI.updateProfile({ name: trimmed })
      const updated = { ...user, name: res.data.name }
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  function formatPhone(value) {
    let v = value.replace(/[^\d+]/g, '')
    if (v && !v.startsWith('+')) v = '+55' + v
    return v
  }

  function isValidPhone(p) {
    return /^\+\d{10,15}$/.test(p)
  }

  async function handleSavePhone() {
    setPhoneError('')
    setPhoneSuccess(false)
    if (!isValidPhone(phone)) {
      setPhoneError('Número inválido. Use o formato internacional: +5511999999999')
      return
    }
    setPhoneLoading(true)
    try {
      await api.put('/auth/phone', { phone })
      setSavedPhone(phone)
      setPhoneSuccess(true)
      setTimeout(() => setPhoneSuccess(false), 3000)
    } catch (e) {
      const msg = e.response?.data?.detail || 'Erro ao salvar número'
      setPhoneError(msg.includes('already') || msg.includes('unique')
        ? 'Este número já está vinculado a outra conta.'
        : msg)
    } finally {
      setPhoneLoading(false)
    }
  }

  async function handleRemovePhone() {
    setPhoneError('')
    setPhoneSuccess(false)
    setPhoneLoading(true)
    try {
      await api.put('/auth/phone', { phone: null })
      setSavedPhone('')
      setPhone('')
      setPhoneSuccess(true)
      setTimeout(() => setPhoneSuccess(false), 3000)
    } catch {
      setPhoneError('Erro ao remover número')
    } finally {
      setPhoneLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meu Perfil</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Gerencie suas informações pessoais
        </p>
      </div>

      {/* Avatar */}
      <div className="flex justify-center mb-8">
        <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shadow-md">
          <span className="text-3xl font-bold text-primary-700 dark:text-primary-400">
            {initials}
          </span>
        </div>
      </div>

      {/* Form — Informações pessoais */}
      <div className="card space-y-5">
        {/* Nome */}
        <div>
          <label className="label flex items-center gap-1.5">
            <User size={13} /> Nome
          </label>
          <input
            type="text"
            className="input-field"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); setSuccess(false) }}
            placeholder="Seu nome"
            maxLength={100}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>

        {/* E-mail (somente leitura) */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Mail size={13} /> E-mail
          </label>
          <input
            type="email"
            className="input-field opacity-60 cursor-not-allowed"
            value={user?.email || ''}
            readOnly
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            O e-mail não pode ser alterado
          </p>
        </div>

        {/* Feedback */}
        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
        {success && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={15} />
            Nome atualizado com sucesso!
          </div>
        )}

        {/* Botão */}
        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            disabled={saving || name.trim() === (user?.name || '')}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Seção WhatsApp */}
      <div className="mt-6">
        {canUseWhatsapp ? (
          /* ── Usuário Pro: formulário completo ── */
          <div className="card space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  WhatsApp
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Vincule seu número para registrar gastos por mensagem
                </p>
              </div>
            </div>

            {savedPhone && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>Número vinculado: <strong>{savedPhone}</strong></span>
              </div>
            )}

            {phoneFetching ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="label">Número do WhatsApp</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      className="input-field pl-10 w-full"
                      placeholder="+5511999999999"
                      value={phone}
                      onChange={e => setPhone(formatPhone(e.target.value))}
                      maxLength={16}
                    />
                  </div>
                  <button
                    className="btn-primary px-4"
                    onClick={handleSavePhone}
                    disabled={phoneLoading || phone === savedPhone}
                  >
                    {phoneLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Formato internacional. Ex: +5511999999999
                </p>
              </div>
            )}

            {phoneSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                {savedPhone ? 'Número salvo com sucesso!' : 'Número removido com sucesso!'}
              </div>
            )}
            {phoneError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                {phoneError}
              </div>
            )}

            {savedPhone && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  className="btn-danger text-sm flex items-center gap-2"
                  onClick={handleRemovePhone}
                  disabled={phoneLoading}
                >
                  <Trash2 className="w-4 h-4" />
                  Desvincular número
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Não-Pro: card bloqueado ── */
          <div className="card opacity-70">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  WhatsApp
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Lock size={10} /> Pro
                  </span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Registre gastos enviando mensagens pelo WhatsApp
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Esta funcionalidade está disponível exclusivamente no plano Pro.
            </p>
            <button
              onClick={() => navigate('/planos')}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm font-semibold transition"
            >
              Fazer upgrade para Pro
            </button>
          </div>
        )}
      </div>
    </div>
  )
}