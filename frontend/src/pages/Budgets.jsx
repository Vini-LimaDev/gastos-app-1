import { useState, useEffect } from 'react'
import { Wallet, Plus, Trash2, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react'
import { budgetsAPI, transactionsAPI } from '../api'

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde',
  'Lazer', 'Educação', 'Vestuário', 'Outros',
]

const CATEGORY_COLORS = {
  Alimentação: 'bg-orange-500',
  Transporte: 'bg-blue-500',
  Moradia: 'bg-purple-500',
  Saúde: 'bg-red-500',
  Lazer: 'bg-yellow-500',
  Educação: 'bg-indigo-500',
  Vestuário: 'bg-pink-500',
  Outros: 'bg-gray-500',
}

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function BudgetCard({ budget, spent, onDelete }) {
  const pct = budget.limit_amount > 0 ? Math.min((spent / budget.limit_amount) * 100, 100) : 0
  const remaining = budget.limit_amount - spent
  const isOver = spent > budget.limit_amount
  const isWarning = !isOver && pct >= 80

  const barColor = isOver
    ? 'bg-red-500'
    : isWarning
    ? 'bg-yellow-500'
    : 'bg-primary-500 dark:bg-primary-400'

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[budget.category] || 'bg-gray-400'}`} />
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{budget.category}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Limite: {fmt(budget.limit_amount)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOver ? (
            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
              <AlertTriangle size={13} /> Limite excedido
            </span>
          ) : isWarning ? (
            <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 font-medium">
              <AlertTriangle size={13} /> Quase no limite
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium">
              <CheckCircle2 size={13} /> No controle
            </span>
          )}
          <button
            onClick={() => onDelete(budget.id)}
            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-1"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Gasto: <span className={`font-semibold ${isOver ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{fmt(spent)}</span>
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {isOver
            ? <span className="font-semibold text-red-600 dark:text-red-400">+{fmt(Math.abs(remaining))} acima</span>
            : <span className="font-semibold text-primary-600 dark:text-primary-400">{fmt(remaining)} restante</span>
          }
        </span>
        <span className="font-bold text-gray-700 dark:text-gray-300">{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}

export default function Budgets() {
  const now = new Date()
  const [budgets, setBudgets] = useState([])
  const [spentByCategory, setSpentByCategory] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: 'Alimentação', limit_amount: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())

  const load = async () => {
    setLoading(true)
    try {
      const [budgetsRes, summaryRes] = await Promise.all([
        budgetsAPI.list(),
        transactionsAPI.monthlySummary(year, month),
      ])
      setBudgets(budgetsRes.data || [])
      setSpentByCategory(summaryRes.data?.by_category || {})
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await budgetsAPI.create({ ...form, limit_amount: parseFloat(form.limit_amount), month, year })
      setShowForm(false)
      setForm({ category: 'Alimentação', limit_amount: '' })
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar orçamento')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este orçamento?')) return
    await budgetsAPI.delete(id)
    await load()
  }

  const usedCategories = new Set(budgets.map((b) => b.category))
  const availableCategories = CATEGORIES.filter((c) => !usedCategories.has(c))

  const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Orçamentos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Limites mensais para {MONTH_NAMES[month - 1]}/{year}
          </p>
        </div>
        {availableCategories.length > 0 && (
          <button
            onClick={() => { setShowForm(true); setForm({ category: availableCategories[0], limit_amount: '' }) }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Novo Orçamento
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card mb-6 border-2 border-primary-200 dark:border-primary-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Wallet size={18} className="text-primary-600 dark:text-primary-400" />
            Novo Orçamento
          </h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            {error && (
              <div className="col-span-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="label">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-field"
              >
                {availableCategories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Limite Mensal (R$)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={form.limit_amount}
                onChange={(e) => setForm({ ...form, limit_amount: e.target.value })}
                className="input-field"
                placeholder="500,00"
                required
              />
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Criar Orçamento'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Budget list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="card text-center py-16">
          <TrendingDown size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum orçamento definido</p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">Defina limites por categoria para controlar seus gastos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              spent={spentByCategory[b.category] || 0}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
