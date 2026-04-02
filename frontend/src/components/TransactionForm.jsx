import { useState, useEffect } from 'react'
import { X, RefreshCw, CreditCard } from 'lucide-react'
import { transactionsAPI } from '../api'
import DatePicker from './DatePicker'
import { useCategories } from '../hooks/useCategories'

const RECURRENCE_OPTIONS = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly',  label: 'Semanal' },
  { value: 'yearly',  label: 'Anual' },
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
  is_installment: false,
  installment_total: '2',
  installment_input_mode: 'total',
  installment_total_value: '',
  installment_per_value: '',
}

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function TransactionForm({ transaction, onSuccess, onClose }) {
  const [form, setForm]       = useState(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const { categories } = useCategories()
  const isEditing = !!transaction

  useEffect(() => {
    if (transaction) {
      setForm({
        ...defaultForm,
        description:          transaction.description.replace(/ \(\d+\/\d+\)$/, ''),
        amount:               String(transaction.amount),
        type:                 transaction.type,
        category:             transaction.category,
        date:                 transaction.date,
        notes:                transaction.notes || '',
        is_recurring:         transaction.is_recurring || false,
        recurrence_interval:  transaction.recurrence_interval || 'monthly',
      })
    }
  }, [transaction])

  const syncInstallmentValues = (updated) => {
    const n = parseInt(updated.installment_total) || 1
    if (updated._changedField === 'installment_total_value') {
      const total = parseFloat(updated.installment_total_value)
      updated.installment_per_value = total > 0 ? (total / n).toFixed(2) : ''
    } else if (updated._changedField === 'installment_per_value') {
      const per = parseFloat(updated.installment_per_value)
      updated.installment_total_value = per > 0 ? (per * n).toFixed(2) : ''
    } else if (updated._changedField === 'installment_total') {
      if (updated.installment_input_mode === 'total' && updated.installment_total_value) {
        const total = parseFloat(updated.installment_total_value)
        updated.installment_per_value = total > 0 ? (total / n).toFixed(2) : ''
      } else if (updated.installment_input_mode === 'per_installment' && updated.installment_per_value) {
        const per = parseFloat(updated.installment_per_value)
        updated.installment_total_value = per > 0 ? (per * n).toFixed(2) : ''
      }
    } else if (updated._changedField === 'installment_input_mode') {
      if (updated.installment_input_mode === 'total' && updated.installment_per_value) {
        const per = parseFloat(updated.installment_per_value)
        updated.installment_total_value = per > 0 ? (per * n).toFixed(2) : ''
      } else if (updated.installment_input_mode === 'per_installment' && updated.installment_total_value) {
        const total = parseFloat(updated.installment_total_value)
        updated.installment_per_value = total > 0 ? (total / n).toFixed(2) : ''
      }
    }
    delete updated._changedField
    return updated
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    let updated = {
      ...form,
      [name]: type === 'checkbox' ? checked : value,
      _changedField: name,
    }
    updated = syncInstallmentValues(updated)
    setForm(updated)
  }

  const getInstallmentAmount = () => {
    const n = parseInt(form.installment_total) || 1
    if (form.installment_input_mode === 'total') {
      const total = parseFloat(form.installment_total_value)
      return total > 0 ? total / n : null
    } else {
      const per = parseFloat(form.installment_per_value)
      return per > 0 ? per : null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (form.is_installment && !isEditing) {
        const amount = getInstallmentAmount()
        if (!amount) { setError('Informe o valor corretamente'); setLoading(false); return }
        await transactionsAPI.create({
          description: form.description, amount, type: form.type,
          category: form.category, date: form.date, notes: form.notes || null,
          is_recurring: false, recurrence_interval: null,
          installment_total: parseInt(form.installment_total),
        })
      } else {
        const payload = {
          description: form.description, amount: parseFloat(form.amount),
          type: form.type, category: form.category, date: form.date,
          notes: form.notes || null, is_recurring: form.is_recurring,
          recurrence_interval: form.is_recurring ? form.recurrence_interval : null,
        }
        if (isEditing) { await transactionsAPI.update(transaction.id, payload) }
        else { await transactionsAPI.create(payload) }
      }
      onSuccess()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) { setError(detail.map(d => d.msg).join(' | ')) }
      else { setError(typeof detail === 'string' ? detail : 'Erro ao salvar transação') }
    } finally {
      setLoading(false)
    }
  }

  const installmentAmount = form.is_installment ? getInstallmentAmount() : null
  const installmentN      = parseInt(form.installment_total) || 0

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>
          )}

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'expense', label: '💸 Despesa', active: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' },
              { value: 'income',  label: '💰 Receita', active: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' },
            ].map(({ value, label, active }) => (
              <button key={value} type="button" onClick={() => setForm({ ...form, type: value })}
                className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  form.type === value ? active : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>{label}</button>
            ))}
          </div>

          {/* Descrição */}
          <div>
            <label className="label">Descrição</label>
            <input name="description" value={form.description} onChange={handleChange}
              className="input-field" placeholder="Ex: Almoço, Uber, Conta de luz..." required />
          </div>

          {/* Parcelamento */}
          {!isEditing && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="is_installment" checked={form.is_installment}
                  onChange={handleChange} className="w-4 h-4 rounded accent-primary-600" />
                <div className="flex items-center gap-2">
                  <CreditCard size={15} className="text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Parcelar compra</span>
                </div>
              </label>
              {form.is_installment && (
                <div className="space-y-3">
                  <div>
                    <label className="label">Número de parcelas</label>
                    <input name="installment_total" type="number" min="2" max="360"
                      value={form.installment_total} onChange={handleChange} className="input-field" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'total', label: 'Valor total' },
                      { value: 'per_installment', label: 'Por parcela' },
                    ].map(({ value, label }) => (
                      <button key={value} type="button"
                        onClick={() => handleChange({ target: { name: 'installment_input_mode', value, type: 'text' } })}
                        className={`py-1.5 text-xs rounded-lg border-2 font-medium transition-all ${
                          form.installment_input_mode === value
                            ? 'bg-primary-50 text-primary-700 border-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-700'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}>{label}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Total (R$)</label>
                      <input name="installment_total_value" type="number" step="0.01" min="0.01"
                        value={form.installment_total_value} onChange={handleChange}
                        className={`input-field ${form.installment_input_mode === 'total' ? 'ring-2 ring-primary-400' : ''}`}
                        placeholder="0,00" required={form.installment_input_mode === 'total'} />
                    </div>
                    <div>
                      <label className="label">Por parcela (R$)</label>
                      <input name="installment_per_value" type="number" step="0.01" min="0.01"
                        value={form.installment_per_value} onChange={handleChange}
                        className={`input-field ${form.installment_input_mode === 'per_installment' ? 'ring-2 ring-primary-400' : ''}`}
                        placeholder="0,00" required={form.installment_input_mode === 'per_installment'} />
                    </div>
                  </div>
                  {installmentAmount && installmentN >= 2 && (
                    <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg px-3 py-2 text-sm text-primary-700 dark:text-primary-300">
                      📅 {installmentN}x de <strong>{fmt(installmentAmount)}</strong>
                      {' '}· Total: <strong>{fmt(installmentAmount * installmentN)}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Valor e Data */}
          {(!form.is_installment || isEditing) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Valor (R$)</label>
                <input name="amount" type="number" step="0.01" min="0.01"
                  value={form.amount} onChange={handleChange}
                  className="input-field" placeholder="0,00" required />
              </div>
              <DatePicker
                label="Data"
                value={form.date}
                onChange={(val) => setForm({ ...form, date: val })}
                required
              />
            </div>
          )}

          {/* Data da 1ª parcela */}
          {form.is_installment && !isEditing && (
            <DatePicker
              label="Data da 1ª parcela"
              value={form.date}
              onChange={(val) => setForm({ ...form, date: val })}
              required
            />
          )}

          {/* Categoria */}
          <div>
            <label className="label">Categoria</label>
            <select name="category" value={form.category} onChange={handleChange} className="input-field" required>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Recorrência */}
          {!form.is_installment && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="is_recurring" checked={form.is_recurring}
                  onChange={handleChange} className="w-4 h-4 rounded accent-primary-600" />
                <div className="flex items-center gap-2">
                  <RefreshCw size={15} className="text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transação recorrente</span>
                </div>
              </label>
              {form.is_recurring && (
                <div>
                  <label className="label">Frequência</label>
                  <select name="recurrence_interval" value={form.recurrence_interval}
                    onChange={handleChange} className="input-field">
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
          )}

          {/* Observações */}
          <div>
            <label className="label">Observações (opcional)</label>
            <textarea name="notes" value={form.notes} onChange={handleChange}
              className="input-field resize-none" rows={2} placeholder="Alguma nota adicional..." />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Salvando...' : isEditing ? 'Salvar' : form.is_installment ? `Criar ${form.installment_total}x parcelas` : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}