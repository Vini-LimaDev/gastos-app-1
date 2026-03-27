import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { transactionsAPI } from '../api'

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde',
  'Lazer', 'Educação', 'Vestuário', 'Outros'
]

const defaultForm = {
  description: '',
  amount: '',
  type: 'expense',
  category: 'Alimentação',
  date: new Date().toISOString().split('T')[0],
  notes: '',
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
      })
    }
  }, [transaction])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {
      ...form,
      amount: parseFloat(form.amount),
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {transaction ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'expense', label: '💸 Despesa', active: 'bg-red-100 text-red-700 border-red-300' },
              { value: 'income', label: '💰 Receita', active: 'bg-green-100 text-green-700 border-green-300' },
            ].map(({ value, label, active }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, type: value })}
                className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  form.type === value ? active : 'border-gray-200 text-gray-600 hover:border-gray-300'
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

          {/* Valor e Data lado a lado */}
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
