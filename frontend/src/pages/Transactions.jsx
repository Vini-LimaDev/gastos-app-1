import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, Trash2, Edit2, ChevronUp, ChevronDown, RefreshCw, ScanLine } from 'lucide-react'
import { transactionsAPI } from '../api'
import TransactionForm from '../components/TransactionForm'
import InvoiceImport from '../components/InvoiceImport'

const CATEGORIES = ['Alimentação','Transporte','Moradia','Saúde','Lazer','Educação','Vestuário','Outros']

const CATEGORY_COLORS = {
  Alimentação: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Transporte:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Moradia:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Saúde:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Lazer:       'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Educação:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Vestuário:   'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Outros:      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [showImport, setShowImport]     = useState(false)
  const [editTx, setEditTx]             = useState(null)
  const [deleteId, setDeleteId]         = useState(null)
  const [showFilters, setShowFilters]   = useState(false)
  const [sortField, setSortField]       = useState('date')
  const [sortDir, setSortDir]           = useState('desc')

  const [filters, setFilters] = useState({
    search: '', category: '', type: '', start_date: '', end_date: '',
    min_amount: '', max_amount: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.category)   params.category   = filters.category
      if (filters.type)       params.type        = filters.type
      if (filters.start_date) params.start_date  = filters.start_date
      if (filters.end_date)   params.end_date    = filters.end_date
      if (filters.min_amount) params.min_amount  = parseFloat(filters.min_amount)
      if (filters.max_amount) params.max_amount  = parseFloat(filters.max_amount)
      const res = await transactionsAPI.list(params)
      setTransactions(res.data || [])
    } finally {
      setLoading(false)
    }
  }, [filters.category, filters.type, filters.start_date, filters.end_date, filters.min_amount, filters.max_amount])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!deleteId) return
    await transactionsAPI.delete(deleteId)
    setDeleteId(null)
    load()
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditTx(null)
    load()
  }

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const displayed = transactions
    .filter(t => !filters.search ||
      t.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      t.category.toLowerCase().includes(filters.search.toLowerCase())
    )
    .sort((a, b) => {
      let diff = 0
      if (sortField === 'date')   diff = new Date(a.date) - new Date(b.date)
      if (sortField === 'amount') diff = a.amount - b.amount
      return sortDir === 'asc' ? diff : -diff
    })

  const totalIncome  = displayed.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = displayed.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="opacity-30"><ChevronUp size={13} /></span>
    return sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{displayed.length} transações encontradas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <ScanLine size={16} />
            <span className="hidden sm:inline">Importar Fatura</span>
          </button>
          <button
            onClick={() => { setEditTx(null); setShowForm(true) }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Nova Transação
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Receitas', value: totalIncome, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Despesas', value: totalExpense, color: 'text-red-500 dark:text-red-400' },
          { label: 'Saldo', value: totalIncome - totalExpense, color: totalIncome - totalExpense >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-red-500 dark:text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="card mb-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              className="input-field pl-9"
              placeholder="Buscar por descrição ou categoria..."
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-400' : ''}`}
          >
            <Filter size={16} /> Filtros
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div>
              <label className="label">Tipo</label>
              <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className="input-field">
                <option value="">Todos</option>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
            <div>
              <label className="label">Categoria</label>
              <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className="input-field">
                <option value="">Todas</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Data início</label>
              <input type="date" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Data fim</label>
              <input type="date" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Valor mínimo</label>
              <input type="number" step="0.01" value={filters.min_amount} onChange={e => setFilters({ ...filters, min_amount: e.target.value })} className="input-field" placeholder="0,00" />
            </div>
            <div>
              <label className="label">Valor máximo</label>
              <input type="number" step="0.01" value={filters.max_amount} onChange={e => setFilters({ ...filters, max_amount: e.target.value })} className="input-field" placeholder="9999,99" />
            </div>
            <div className="col-span-2 md:col-span-3 flex justify-end">
              <button
                onClick={() => setFilters({ search: '', category: '', type: '', start_date: '', end_date: '', min_amount: '', max_amount: '' })}
                className="btn-secondary text-sm"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="card text-center py-12 text-gray-400 dark:text-gray-600">
          Nenhuma transação encontrada
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                    onClick={() => toggleSort('date')}
                  >
                    <span className="flex items-center gap-1">Data <SortIcon field="date" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Categoria</th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                    onClick={() => toggleSort('amount')}
                  >
                    <span className="flex items-center justify-end gap-1">Valor <SortIcon field="amount" /></span>
                  </th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {displayed.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{t.description}</span>
                        {t.is_recurring && (
                          <span title="Recorrente" className="text-blue-400 dark:text-blue-500">
                            <RefreshCw size={12} />
                          </span>
                        )}
                      </div>
                      {t.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${CATEGORY_COLORS[t.category] || 'bg-gray-100 text-gray-700'}`}>
                        {t.category}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      t.type === 'income' ? 'text-primary-600 dark:text-primary-400' : 'text-red-500 dark:text-red-400'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditTx(t); setShowForm(true) }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(t.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Remover transação?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleDelete} className="btn-danger flex-1">Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction form */}
      {showForm && (
        <TransactionForm
          transaction={editTx}
          onSuccess={handleFormSuccess}
          onClose={() => { setShowForm(false); setEditTx(null) }}
        />
      )}

      {/* Invoice import */}
      {showImport && (
        <InvoiceImport
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); load() }}
        />
      )}
    </div>
  )
}