import { useState, useEffect } from 'react'
import { MessageCircle, Phone, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react'
import api from '../api'

export default function WhatsAppSettings() {
  const [phone, setPhone]       = useState('')
  const [saved, setSaved]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  // Carrega o número já cadastrado
  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        if (res.data.phone) {
          setSaved(res.data.phone)
          setPhone(res.data.phone)
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [])

  function formatPhone(value) {
    // Mantém apenas dígitos e o +
    let v = value.replace(/[^\d+]/g, '')
    // Garante que começa com +55 se o usuário não digitou código
    if (v && !v.startsWith('+')) v = '+55' + v
    return v
  }

  function isValidPhone(p) {
    // Aceita +55XXXXXXXXXXX (13 dígitos com +55)
    return /^\+\d{10,15}$/.test(p)
  }

  async function handleSave() {
    setError('')
    setSuccess(false)

    if (!isValidPhone(phone)) {
      setError('Número inválido. Use o formato internacional: +5511999999999')
      return
    }

    setLoading(true)
    try {
      await api.put('/auth/phone', { phone })
      setSaved(phone)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      const msg = e.response?.data?.detail || 'Erro ao salvar número'
      setError(msg.includes('already') || msg.includes('unique')
        ? 'Este número já está vinculado a outra conta.'
        : msg
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      await api.put('/auth/phone', { phone: null })
      setSaved('')
      setPhone('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError('Erro ao remover número')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="card flex items-center gap-3 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Carregando configurações...</span>
      </div>
    )
  }

  return (
    <div className="card space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
          <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Integração WhatsApp
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Registre gastos enviando mensagens pelo WhatsApp
          </p>
        </div>
      </div>

      {/* Como funciona */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium text-green-800 dark:text-green-300">Como funciona:</p>
        <ul className="text-sm text-green-700 dark:text-green-400 space-y-1 list-none">
          <li>1. Cadastre seu número abaixo</li>
          <li>2. Salve o número do bot nos seus contatos</li>
          <li>3. Mande mensagens como:<br />
            <span className="font-mono bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded text-xs ml-4">
              "Gastei 80 reais de gasolina"
            </span>
          </li>
          <li>4. Confirme com <strong>sim</strong> e pronto! ✅</li>
        </ul>
      </div>

      {/* Status atual */}
      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Número vinculado: <strong>{saved}</strong></span>
        </div>
      )}

      {/* Formulário */}
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
            onClick={handleSave}
            disabled={loading || phone === saved}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Formato internacional com código do país. Ex: +5511999999999
        </p>
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          {saved ? 'Número salvo com sucesso!' : 'Número removido com sucesso!'}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Remover vínculo */}
      {saved && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            className="btn-danger text-sm flex items-center gap-2"
            onClick={handleRemove}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4" />
            Desvincular número
          </button>
        </div>
      )}
    </div>
  )
}