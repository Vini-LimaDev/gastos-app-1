import { useState, useEffect } from 'react'
import { RefreshCw, Plus, Trash2, Edit2, Play } from 'lucide-react'
import { transactionsAPI } from '../api'
import TransactionForm from '../components/TransactionForm'

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

export default function Recurring() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTransaction, setEditTransaction] = useState(null)
  const [launching, setLaunching] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await transactionsAPI.list({ is_recurring: true })
      setTransactions(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Remover esta transação recorrente?')) return
    await transactionsAPI.delete(id)
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
        is_recurring: false,
        recurrence_interval: null,
      })
      setSuccessMsg(`"${t.description}" lançada para hoje!`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } finally {
      setLaunching(null)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditTransaction(null)
    load()
  }

  const expenses = transactions.filter((t) => t.type === 'expense')
  const incomes = transactions.filter((t) => t.type === 'income')
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
            {transactions.length} configurada{transactions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditTransaction(null); setShowForm(true) }}
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
      {transactions.length > 0 && (
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
      ) : transactions.length === 0 ? (
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
                    <div
                      key={t.id}
                      className="card flex items-center gap-4 py-4"
                    >
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <RefreshCw size={16} className="text-gray-500 dark:text-gray-400" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{t.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INTERVAL_COLORS[t.recurrence_interval] || INTERVAL_COLORS.monthly}`}>
                            {INTERVAL_LABELS[t.recurrence_interval] || 'Mensal'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Outros}`}>
                            {t.category}
                          </span>
                          {t.notes && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[150px]">{t.notes}</span>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <span className={`text-lg font-bold ${typeColor} flex-shrink-0`}>
                        {sign}{fmt(t.amount)}
                      </span>

                      {/* Actions */}
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
                          onClick={() => { setEditTransaction(t); setShowForm(true) }}
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

      {/* Form modal */}
      {showForm && (
        <TransactionForm
          transaction={editTransaction}
          onSuccess={handleFormSuccess}
          onClose={() => { setShowForm(false); setEditTransaction(null) }}
        />
      )}
    </div>
  )
}
