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

function BudgetCard({ budget, spent, onDeleteRequest }) {
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
            onClick={() => onDeleteRequest(budget.id)}
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
  const [deleteId, setDeleteId] = useState(null)

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

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await budgetsAPI.delete(deleteId)
      setDeleteId(null)
      await load()
    } catch {
      // silently fail
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Wallet size={24} className="text-primary-600 dark:text-primary-400" />
            Orçamentos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Limites por categoria · {now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo Orçamento
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Definir orçamento</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>
          )}
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input-field flex-1"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input
              type="number"
              placeholder="Limite (R$)"
              value={form.limit_amount}
              onChange={(e) => setForm({ ...form, limit_amount: e.target.value })}
              className="input-field flex-1"
              min="0"
              step="0.01"
              required
            />
            <button type="submit" disabled={saving} className="btn-primary whitespace-nowrap">
              {saving ? 'Salvando...' : 'Criar Orçamento'}
            </button>
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
              onDeleteRequest={setDeleteId}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Remover orçamento?</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 ml-13 pl-1">
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger flex-1"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}