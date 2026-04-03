import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, CreditCard, X, Check, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { cardsAPI, transactionsAPI } from '../api'

// ── Constants ─────────────────────────────────────────
const BANK_COLORS = {
  Itaú: '#EC7000', Nubank: '#8A05BE', Inter: '#FF7A00',
  Bradesco: '#CC092F', Santander: '#EC0000', 'Banco do Brasil': '#FFCC00',
  Caixa: '#0070AF', C6: '#242424', BTG: '#072A6C', XP: '#000000', Outro: '#6366f1',
}

const PRESET_COLORS = [
  '#6366f1','#EC7000','#8A05BE','#FF7A00','#CC092F',
  '#EC0000','#0070AF','#242424','#16a34a','#0ea5e9',
]

const CATEGORY_COLORS_HEX = {
  Alimentação:'#f97316', Transporte:'#3b82f6', Moradia:'#a855f7',
  Saúde:'#ef4444', Lazer:'#eab308', Educação:'#6366f1',
  Vestuário:'#ec4899', Outros:'#6b7280',
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const defaultForm = {
  name: '', bank: '', last_four: '', color: '#6366f1', card_type: 'credit',
}

// ── Sub-components ────────────────────────────────────
function CardVisual({ card, small = false }) {
  const size = small ? 'w-16 h-10 text-[9px]' : 'w-full h-40 text-sm'
  return (
    <div
      className={`${size} rounded-xl flex flex-col justify-between p-3 text-white font-medium shadow-lg select-none`}
      style={{ background: `linear-gradient(135deg, ${card.color}dd, ${card.color}88)` }}
    >
      {!small && (
        <div className="flex justify-between items-start">
          <span className="font-bold text-base opacity-90">{card.name}</span>
          <CreditCard size={20} className="opacity-70" />
        </div>
      )}
      <div className={`flex ${small ? 'items-center gap-1' : 'flex-col gap-1'}`}>
        {!small && (
          <span className="tracking-widest text-lg opacity-80">
            •••• •••• •••• {card.last_four}
          </span>
        )}
        <span className={`opacity-75 ${small ? 'text-[8px]' : 'text-xs'}`}>
          {small ? card.last_four : card.bank}
        </span>
      </div>
    </div>
  )
}

// ── Dashboard section ─────────────────────────────────
function CardsDashboard({ cards }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [txs, setTxs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    setLoading(true)
    const daysInMonth = new Date(year, month, 0).getDate()
    transactionsAPI.list({
      start_date: `${year}-${String(month).padStart(2,'0')}-01`,
      end_date:   `${year}-${String(month).padStart(2,'0')}-${daysInMonth}`,
      type: 'expense',
    }).then(res => {
      setTxs(res.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [month, year])

  // Build per-card stats
  const cardMap = Object.fromEntries(cards.map(c => [c.id, c]))

  const statsPerCard = cards.map(card => {
    const cardTxs = txs.filter(t => t.card_id === card.id)
    const total   = cardTxs.reduce((s, t) => s + t.amount, 0)
    const byCategory = {}
    cardTxs.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
    })
    return { card, total, byCategory, count: cardTxs.length }
  }).filter(s => s.total > 0 || cards.length <= 3)

  // Bar chart data — one bar per card
  const barData = statsPerCard.map(s => ({
    name: `${s.card.bank} •••${s.card.last_four}`,
    total: s.total,
    color: s.card.color,
  }))

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  const totalAll = statsPerCard.reduce((s, c) => s + c.total, 0)

  return (
    <div className="mb-8 space-y-4">
      {/* Header com navegação de mês */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Gastos por Cartão
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <ChevronDown size={16} className="rotate-90" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[100px] text-center flex items-center gap-1.5 justify-center">
            <Calendar size={14} className="text-gray-400" />
            {MONTH_NAMES[month - 1]}/{year}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronDown size={16} className="-rotate-90" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {statsPerCard.map(({ card, total, count }) => (
              <div
                key={card.id}
                className="card py-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setExpanded(expanded === card.id ? null : card.id)}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${card.color}22`, border: `2px solid ${card.color}44` }}
                >
                  <CreditCard size={18} style={{ color: card.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {card.bank} •••{card.last_four}
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(total)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{count} transaç{count !== 1 ? 'ões' : 'ão'}</p>
                </div>
                {totalAll > 0 && (
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: `${card.color}22`, color: card.color }}>
                      {((total / totalAll) * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Gasto por categoria — expansível por cartão */}
          {statsPerCard.map(({ card, total, byCategory }) => (
            expanded === card.id && Object.keys(byCategory).length > 0 && (
              <div key={`exp-${card.id}`} className="card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-3 h-3 rounded-full" style={{ background: card.color }} />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    {card.name} — Gastos por Categoria em {MONTH_NAMES[month-1]}
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(byCategory)
                    .sort(([,a],[,b]) => b - a)
                    .map(([cat, val]) => {
                      const pct = total > 0 ? (val / total) * 100 : 0
                      const color = CATEGORY_COLORS_HEX[cat] || '#6b7280'
                      return (
                        <div key={cat}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">{pct.toFixed(0)}%</span>
                              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{fmt(val)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: color }}
                            />
                          </div>
                        </div>
                      )
                    })
                  }
                </div>
              </div>
            )
          ))}

          {/* Gráfico de barras comparando cartões */}
          {barData.filter(b => b.total > 0).length >= 2 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-4">
                Comparativo de Gastos — {MONTH_NAMES[month-1]}/{year}
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} barSize={32} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                  <Tooltip
                    formatter={v => fmt(v)}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} name="Gasto">
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Empty state */}
          {totalAll === 0 && (
            <div className="card text-center py-8 text-gray-400 dark:text-gray-600 text-sm">
              Nenhum gasto registrado em {MONTH_NAMES[month-1]}/{year}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────
export default function Cards() {
  const [cards, setCards]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState(null)
  const [form, setForm]       = useState(defaultForm)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await cardsAPI.list()
      setCards(res.data || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditCard(null); setForm(defaultForm); setError(''); setShowForm(true)
  }

  const openEdit = (card) => {
    setEditCard(card)
    setForm({ name: card.name, bank: card.bank, last_four: card.last_four, color: card.color, card_type: card.card_type })
    setError(''); setShowForm(true)
  }

  const handleBankSelect = (bank) => {
    const color = BANK_COLORS[bank] || '#6366f1'
    setForm(f => ({ ...f, bank, color }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^\d{4}$/.test(form.last_four)) { setError('Os últimos 4 dígitos devem ser numéricos'); return }
    setSaving(true)
    try {
      if (editCard) await cardsAPI.update(editCard.id, form)
      else await cardsAPI.create(form)
      setShowForm(false); setEditCard(null)
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar cartão')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await cardsAPI.delete(deleteId)
    setDeleteId(null); load()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cartões</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Gerencie seus cartões e acompanhe os gastos
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo Cartão
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cards.length === 0 ? (
        <div className="card text-center py-16">
          <CreditCard size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum cartão cadastrado</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Adicione seus cartões para vincular às transações
          </p>
          <button onClick={openNew} className="btn-primary mt-4 mx-auto">
            Adicionar cartão
          </button>
        </div>
      ) : (
        <>
          {/* Dashboard */}
          <CardsDashboard cards={cards} />

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wide">Meus Cartões</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <div key={card.id} className="card p-4">
                <CardVisual card={card} />
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{card.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {card.bank} · {card.card_type === 'credit' ? 'Crédito' : 'Débito'} · •••• {card.last_four}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(card)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteId(card.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editCard ? 'Editar Cartão' : 'Novo Cartão'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>
              )}

              {/* Preview */}
              <CardVisual card={{ ...form, name: form.name || 'Meu Cartão', bank: form.bank || 'Banco' }} />

              {/* Nome */}
              <div>
                <label className="label">Nome do cartão</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field" placeholder="Ex: Nubank Black, Itaú Visa..." required />
              </div>

              {/* Banco */}
              <div>
                <label className="label">Banco</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {Object.keys(BANK_COLORS).map(bank => (
                    <button key={bank} type="button" onClick={() => handleBankSelect(bank)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        form.bank === bank
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}>{bank}</button>
                  ))}
                </div>
                <input value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}
                  className="input-field" placeholder="Ou digite o nome do banco" required />
              </div>

              {/* Últimos 4 dígitos + Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Últimos 4 dígitos</label>
                  <input value={form.last_four}
                    onChange={e => setForm(f => ({ ...f, last_four: e.target.value.replace(/\D/g,'').slice(0,4) }))}
                    className="input-field" placeholder="1234" maxLength={4} required />
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select value={form.card_type} onChange={e => setForm(f => ({ ...f, card_type: e.target.value }))} className="input-field">
                    <option value="credit">Crédito</option>
                    <option value="debit">Débito</option>
                  </select>
                </div>
              </div>

              {/* Cor */}
              <div>
                <label className="label">Cor do cartão</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))}
                      className="w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center"
                      style={{ background: color, borderColor: form.color === color ? '#fff' : 'transparent', outline: form.color === color ? `2px solid ${color}` : 'none' }}>
                      {form.color === color && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-7 h-7 rounded-full cursor-pointer border border-gray-200 dark:border-gray-700" title="Cor personalizada" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Salvando...' : editCard ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Remover cartão?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              As transações vinculadas não serão excluídas, apenas o vínculo será removido.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleDelete} className="btn-danger flex-1">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}