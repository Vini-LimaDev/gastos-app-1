import { useState } from 'react'
import { User, Mail, Save, CheckCircle } from 'lucide-react'
import { authAPI } from '../api'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Profile() {
  const { user, setUser } = useAuth()

  const [name, setName]       = useState(user?.name || '')
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  const initials = name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const handleSave = async () => {
    setError('')
    setSuccess(false)
    const trimmed = name.trim()
    if (!trimmed) return setError('O nome não pode ser vazio')

    setSaving(true)
    try {
      const res = await authAPI.updateProfile({ name: trimmed })
      // Atualiza o user no contexto e no localStorage
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

      {/* Form */}
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
        {error && (
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        )}
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
    </div>
  )
}