import { useState, useEffect } from 'react'
import { RefreshCw, Plus, Trash2, Edit2, Play, X } from 'lucide-react'
import { recurringAPI, transactionsAPI } from '../api'
import { useCategories } from '../hooks/useCategories'
import DatePicker from '../components/DatePicker'

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const INTERVAL_LABELS = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  yearly: 'Anual',
}

const INTERVAL_COLORS = {
  monthly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  weekly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  yearly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const CATEGORY_COLORS = {
  Alimentação: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Transporte: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Moradia: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Saúde: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Lazer: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Educação: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Vestuário: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Outros: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

const today = new Date().toISOString().split('T')[0]

const defaultForm = {
  description: '',
  amount: '',
  type: 'expense',
  category: 'Alimentação',
  notes: '',
  recurrence_interval: 'monthly',
  date: today, // só usado para extrair o dia
}

// ── Form Modal ────────────────────────────────────────────────────────────────
function RecurringForm({ template, onSuccess, onClose }) {
  const [form, setForm] = useState(template ? {
    description: template.description,
    amount: String(template.amount),
    type: template.type,
    category: template.category,
    notes: template.notes || '',
    recurrence_interval: template.recurrence_interval,
    // Reconstrói uma data fictícia só para exibir o dia salvo no DatePicker
    date: template.day_of_month
      ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(template.day_of_month).padStart(2, '0')}`
      : today,
  } : defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { categories } = useCategories()
  const isEditing = !!template

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const day = parseInt(form.date.split('-')[2])
      const payload = {
        description: form.description,
        amount: parseFloat(form.amount),
        type: form.type,
        category: form.category,
        notes: form.notes || null,
        recurrence_interval: form.recurrence_interval,
        day_of_month: day,
      }
      if (isEditing) {
        await recurringAPI.update(template.id, payload)
      } else {
        await recurringAPI.create(payload)
      }
      onSuccess()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const dayLabel = {
    monthly: 'Todo dia',
    weekly: 'A partir da semana de',
    yearly: 'Todo ano em',
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar Recorrente' : 'Nova Recorrente'}
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
              <button key={value} type="button" onClick={() => setForm(f => ({ ...f, type: value }))}
                className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  form.type === value ? active : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>{label}</button>
            ))}
          </div>

          {/* Descrição */}
          <div>
            <label className="label">Descrição</label>
            <input name="description" value={form.description} onChange={handleChange}
              className="input-field" placeholder="Ex: Salário, Aluguel, Netflix..." required />
          </div>

          {/* Valor */}
          <div>
            <label className="label">Valor (R$)</label>
            <input name="amount" type="number" step="0.01" min="0.01"
              value={form.amount} onChange={handleChange}
              className="input-field" placeholder="0,00" required />
          </div>

          {/* Categoria */}
          <div>
            <label className="label">Categoria</label>
            <select name="category" value={form.category} onChange={handleChange} className="input-field" required>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Frequência + Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Frequência</label>
              <select name="recurrence_interval" value={form.recurrence_interval} onChange={handleChange} className="input-field">
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <DatePicker
              label="Dia de lançamento"
              value={form.date}
              onChange={(val) => setForm(f => ({ ...f, date: val }))}
              required
            />
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">
            {form.recurrence_interval === 'monthly' && `Lançado todo dia ${parseInt(form.date.split('-')[2])} do mês`}
            {form.recurrence_interval === 'weekly' && 'Lançado toda semana no mesmo dia da semana'}
            {form.recurrence_interval === 'yearly' && `Lançado todo ano nesta data`}
          </p>

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
              {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Recurring() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTemplate, setEditTemplate] = useState(null)
  const [launching, setLaunching] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await recurringAPI.list()
      setTemplates(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Remover esta transação recorrente?')) return
    await recurringAPI.delete(id)
    await load()
  }

  const handleLaunchNow = async (t) => {
    setLaunching(t.id)
    try {
      const today = new Date().toISOString().split('T')[0]
      await transactionsAPI.create({
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: today,
        notes: t.notes,
      })
      setSuccessMsg(`"${t.description}" lançada para hoje!`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } finally {
      setLaunching(null)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditTemplate(null)
    load()
  }

  const expenses = templates.filter((t) => t.type === 'expense')
  const incomes = templates.filter((t) => t.type === 'income')
  const totalMonthlyExpense = expenses
    .filter((t) => t.recurrence_interval === 'monthly')
    .reduce((s, t) => s + t.amount, 0)
  const totalMonthlyIncome = incomes
    .filter((t) => t.recurrence_interval === 'monthly')
    .reduce((s, t) => s + t.amount, 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transações Recorrentes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {templates.length} configurada{templates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditTemplate(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Nova Recorrente
        </button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl text-primary-700 dark:text-primary-400 text-sm font-medium">
          ✓ {successMsg}
        </div>
      )}

      {/* Summary cards */}
      {templates.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Despesas mensais fixas</p>
            <p className="text-xl font-bold text-red-500 dark:text-red-400">{fmt(totalMonthlyExpense)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{expenses.filter(t => t.recurrence_interval === 'monthly').length} despesas</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Receitas mensais fixas</p>
            <p className="text-xl font-bold text-primary-600 dark:text-primary-400">{fmt(totalMonthlyIncome)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{incomes.filter(t => t.recurrence_interval === 'monthly').length} receitas</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="card text-center py-16">
          <RefreshCw size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma transação recorrente</p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
            Cadastre salário, aluguel, assinaturas e outros lançamentos fixos
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { label: 'Despesas', list: expenses, typeColor: 'text-red-500 dark:text-red-400', sign: '-' },
            { label: 'Receitas', list: incomes, typeColor: 'text-primary-600 dark:text-primary-400', sign: '+' },
          ].map(({ label, list, typeColor, sign }) =>
            list.length > 0 ? (
              <div key={label}>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{label}</h2>
                <div className="space-y-2">
                  {list.map((t) => (
                    <div key={t.id} className="card flex items-center gap-4 py-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <RefreshCw size={16} className="text-gray-500 dark:text-gray-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{t.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INTERVAL_COLORS[t.recurrence_interval] || INTERVAL_COLORS.monthly}`}>
                            {INTERVAL_LABELS[t.recurrence_interval] || 'Mensal'}
                            {t.recurrence_interval === 'monthly' && t.day_of_month ? ` · dia ${t.day_of_month}` : ''}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Outros}`}>
                            {t.category}
                          </span>
                          {t.notes && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[150px]">{t.notes}</span>
                          )}
                        </div>
                      </div>

                      <span className={`text-lg font-bold ${typeColor} flex-shrink-0`}>
                        {sign}{fmt(t.amount)}
                      </span>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleLaunchNow(t)}
                          disabled={launching === t.id}
                          title="Lançar agora"
                          className="p-2 rounded-lg text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
                        >
                          {launching === t.id
                            ? <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            : <Play size={15} />
                          }
                        </button>
                        <button
                          onClick={() => { setEditTemplate(t); setShowForm(true) }}
                          title="Editar"
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          title="Remover"
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      {showForm && (
        <RecurringForm
          template={editTemplate}
          onSuccess={handleFormSuccess}
          onClose={() => { setShowForm(false); setEditTemplate(null) }}
        />
      )}
    </div>
  )
}