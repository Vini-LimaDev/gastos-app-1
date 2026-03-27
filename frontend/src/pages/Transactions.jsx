import { useState, useEffect, useCallback } from 'react'
import { transactionsAPI } from '../api'
import TransactionForm from '../components/TransactionForm'
import { Plus, Search, Pencil, Trash2, Filter, X, ChevronUp, ChevronDown } from 'lucide-react'

const CATEGORIES = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Vestuário', 'Outros']

const CATEGORY_COLORS = {
  'Alimentação': 'bg-green-100 text-green-700',
  'Transporte': 'bg-blue-100 text-blue-700',
  'Moradia': 'bg-yellow-100 text-yellow-700',
  'Saúde': 'bg-red-100 text-red-700',
  'Lazer': 'bg-purple-100 text-purple-700',
  'Educação': 'bg-cyan-100 text-cyan-700',
  'Vestuário': 'bg-pink-100 text-pink-700',
  'Outros': 'bg-gray-100 text-gray-700',
}

const defaultFilters = {
  start_date: '',
  end_date: '',
  category: '',
  type: '',
  min_amount: '',
  max_amount: '',
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [filters, setFilters] = useState(defaultFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.start_date) params.start_date = filters.start_date
      if (filters.end_date) params.end_date = filters.end_date
      if (filters.category) params.category = filters.category
      if (filters.type) params.type = filters.type
      if (filters.min_amount) params.min_amount = parseFloat(filters.min_amount)
      if (filters.max_amount) params.max_amount = parseFloat(filters.max_amount)

      const res = await transactionsAPI.list(params)
      setTransactions(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const handleDelete = async (id) => {
    try {
      await transactionsAPI.delete(id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      setConfirmDelete(null)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const filtered = transactions
    .filter((t) => !search || t.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let va = a[sortField]
      let vb = b[sortField]
      if (sortField === 'amount') { va = Number(va); vb = Number(vb) }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const activeFilters = Object.values(filters).filter(Boolean).length

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={14} className="text-gray-300" />
    return sortDir === 'asc' ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
          <p className="text-gray-600 mt-1">Gerencie suas receitas e despesas</p>
        </div>
        <button
          onClick={() => { setEditingTx(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Nova Transação
        </button>
      </div>

      {/* Sumário */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Receitas</p>
          <p className="text-lg font-bold text-green-600">
            {totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Despesas</p>
          <p className="text-lg font-bold text-red-600">
            {totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Saldo</p>
          <p className={`text-lg font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(totalIncome - totalExpenses).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      {/* Barra de busca e filtros */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição..."
            className="input-field pl-9"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-2 ${showFilters ? 'border-green-500 text-green-700' : ''}`}
        >
          <Filter size={16} />
          Filtros
          {activeFilters > 0 && (
            <span className="bg-green-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
        {activeFilters > 0 && (
          <button
            onClick={() => setFilters(defaultFilters)}
            className="btn-secondary text-red-600 hover:bg-red-50 flex items-center gap-1"
          >
            <X size={14} />
            Limpar
          </button>
        )}
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="card mb-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Data início</label>
            <input type="date" value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="input-field" />
          </div>
          <div>
            <label className="label">Data fim</label>
            <input type="date" value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="input-field" />
          </div>
          <div>
            <label className="label">Categoria</label>
            <select value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="input-field">
              <option value="">Todas</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo</label>
            <select value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="input-field">
              <option value="">Todos</option>
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </div>
          <div>
            <label className="label">Valor mínimo</label>
            <input type="number" step="0.01" min="0" value={filters.min_amount}
              onChange={(e) => setFilters({ ...filters, min_amount: e.target.value })}
              className="input-field" placeholder="R$ 0,00" />
          </div>
          <div>
            <label className="label">Valor máximo</label>
            <input type="number" step="0.01" min="0" value={filters.max_amount}
              onChange={(e) => setFilters({ ...filters, max_amount: e.target.value })}
              className="input-field" placeholder="R$ 0,00" />
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Receipt size={48} className="mb-3 opacity-30" />
            <p className="text-sm">Nenhuma transação encontrada</p>
            <button
              onClick={() => { setEditingTx(null); setShowForm(true) }}
              className="mt-3 text-green-600 text-sm hover:underline"
            >
              Adicionar primeira transação
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th
                  onClick={() => handleSort('date')}
                  className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">Data <SortIcon field="date" /></div>
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">
                  Descrição
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">
                  Categoria
                </th>
                <th
                  onClick={() => handleSort('amount')}
                  className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center justify-end gap-1">Valor <SortIcon field="amount" /></div>
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">{t.date}</td>
                  <td className="px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.description}</p>
                      {t.notes && <p className="text-xs text-gray-400 mt-0.5">{t.notes}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_COLORS[t.category] || 'bg-gray-100 text-gray-600'}`}>
                      {t.category}
                    </span>
                  </td>
                  <td className={`px-6 py-3 text-sm font-semibold text-right whitespace-nowrap ${
                    t.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}
                    {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditingTx(t); setShowForm(true) }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(t.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Confirmar exclusão</h3>
            <p className="text-sm text-gray-600 mb-5">
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="btn-danger flex-1">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <TransactionForm
          transaction={editingTx}
          onSuccess={() => { setShowForm(false); setEditingTx(null); fetchTransactions() }}
          onClose={() => { setShowForm(false); setEditingTx(null) }}
        />
      )}
    </div>
  )
}

// Fix missing import
const Receipt = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 1 8 6 11 1 14 6 17 1 19 6" />
    <path d="M3 6h16v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="16" y2="15" />
  </svg>
)
