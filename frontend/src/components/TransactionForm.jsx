import { useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { transactionsAPI } from '../api'

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde',
  'Lazer', 'Educação', 'Vestuário', 'Outros',
]

const RECURRENCE_OPTIONS = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
]

const defaultForm = {
  description: '',
  amount: '',
  type: 'expense',
  category: 'Alimentação',
  date: new Date().toISOString().split('T')[0],
  notes: '',
  is_recurring: false,
  recurrence_interval: 'monthly',
}

export default function TransactionForm({ transaction, onSuccess, onClose }) {
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (transaction) {
      setForm({
        description: transaction.description,
        amount: String(transaction.amount),
        type: transaction.type,
        category: transaction.category,
        date: transaction.date,
        notes: transaction.notes || '',
        is_recurring: transaction.is_recurring || false,
        recurrence_interval: transaction.recurrence_interval || 'monthly',
      })
    }
  }, [transaction])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      recurrence_interval: form.is_recurring ? form.recurrence_interval : null,
    }

    try {
      if (transaction) {
        await transactionsAPI.update(transaction.id, payload)
      } else {
        await transactionsAPI.create(payload)
      }
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar transação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {transaction ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'expense', label: '💸 Despesa', active: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' },
              { value: 'income', label: '💰 Receita', active: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' },
            ].map(({ value, label, active }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, type: value })}
                className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  form.type === value
                    ? active
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Descrição */}
          <div>
            <label className="label">Descrição</label>
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              className="input-field"
              placeholder="Ex: Almoço, Uber, Conta de luz..."
              required
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valor (R$)</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={handleChange}
                className="input-field"
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <label className="label">Data</label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="label">Categoria</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="input-field"
              required
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Recorrência */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_recurring"
                checked={form.is_recurring}
                onChange={handleChange}
                className="w-4 h-4 rounded accent-primary-600"
              />
              <div className="flex items-center gap-2">
                <RefreshCw size={15} className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transação recorrente</span>
              </div>
            </label>

            {form.is_recurring && (
              <div>
                <label className="label">Frequência</label>
                <select
                  name="recurrence_interval"
                  value={form.recurrence_interval}
                  onChange={handleChange}
                  className="input-field"
                >
                  {RECURRENCE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Esta transação será lançada automaticamente
                </p>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="label">Observações (opcional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="input-field resize-none"
              rows={2}
              placeholder="Alguma nota adicional..."
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Salvando...' : transaction ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
