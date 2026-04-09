import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Hash,
  ArrowUpRight, ArrowDownRight, ChevronRight, AlertTriangle,
  CreditCard, Flame,
} from 'lucide-react'
import { transactionsAPI, budgetsAPI, cardsAPI } from '../api'

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const CATEGORY_COLORS = {
  Alimentação: '#f97316',
  Transporte:  '#3b82f6',
  Moradia:     '#a855f7',
  Saúde:       '#ef4444',
  Lazer:       '#eab308',
  Educação:    '#6366f1',
  Vestuário:   '#ec4899',
  Outros:      '#6b7280',
}

const CATEGORY_COLORS_HEX = CATEGORY_COLORS

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// ── Stat Card ─────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Budget Mini Card ──────────────────────────────────
function BudgetMiniCard({ budget, spent }) {
  const pct = budget.limit_amount > 0 ? Math.min((spent / budget.limit_amount) * 100, 100) : 0
  const isOver = spent > budget.limit_amount
  const isWarning = !isOver && pct >= 80
  const barColor = isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-primary-500 dark:bg-primary-400'

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1.5">
          {(isOver || isWarning) && (
            <AlertTriangle size={12} className={isOver ? 'text-red-500' : 'text-yellow-500'} />
          )}
          {budget.category}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {fmt(spent)} / {fmt(budget.limit_amount)}
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Spending Heatmap ──────────────────────────────────
const INTENSITY_CLASSES = [
  'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600',
  'bg-red-100 dark:bg-red-900/30 text-red-400',
  'bg-red-300 dark:bg-red-700/60 text-red-600 dark:text-red-300',
  'bg-red-500 dark:bg-red-600 text-white',
  'bg-red-700 dark:bg-red-500 text-white font-bold',
]
const WEEK_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function getIntensity(value, max) {
  if (!value || value === 0) return 0
  const pct = value / max
  if (pct <= 0.25) return 1
  if (pct <= 0.5)  return 2
  if (pct <= 0.75) return 3
  return 4
}

function SpendingHeatmap({ transactions = [], month, year }) {
  const daysInMonth   = new Date(year, month, 0).getDate()
  const firstWeekday  = new Date(year, month - 1, 1).getDay()

  // gastos por dia
  const spendByDay = {}
  for (let d = 1; d <= daysInMonth; d++) spendByDay[d] = 0
  transactions.forEach((t) => {
    if (t.type !== 'expense') return
    const d = new Date(t.date + 'T12:00:00')
    if (d.getMonth() + 1 !== month || d.getFullYear() !== year) return
    spendByDay[d.getDate()] = (spendByDay[d.getDate()] || 0) + t.amount
  })

  const values     = Object.values(spendByDay)
  const maxDay     = Math.max(...values, 1)
  const totalMonth = values.reduce((s, v) => s + v, 0)
  const avgDaily   = daysInMonth > 0 ? totalMonth / daysInMonth : 0
  const highestDay = Object.entries(spendByDay).sort((a, b) => b[1] - a[1])[0]

  // grade semanal
  const cells = Array(firstWeekday).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const today = new Date()
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-red-500" />
          <h2 className="section-title">Mapa de Calor</h2>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(totalMonth)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Média diária: {fmt(avgDaily)}</p>
        </div>
      </div>

      {/* Labels dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] text-gray-400 dark:text-gray-600 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Grade */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (!day) return <div key={`e-${wi}-${di}`} className="aspect-square" />
              const amount    = spendByDay[day] || 0
              const intensity = getIntensity(amount, maxDay)
              const isToday   = isCurrentMonth && today.getDate() === day
              const isFuture  = isCurrentMonth && day > today.getDate()
              return (
                <div
                  key={day}
                  title={!isFuture && amount > 0 ? `Dia ${day}: ${fmt(amount)}` : `Dia ${day}`}
                  className={`
                    aspect-square rounded-md flex items-center justify-center
                    text-[11px] select-none transition-transform hover:scale-110 cursor-default
                    ${isFuture
                      ? 'bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-700'
                      : INTENSITY_CLASSES[intensity]
                    }
                    ${isToday ? 'ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-gray-900' : ''}
                  `}
                >
                  {day}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-[10px] text-gray-400 dark:text-gray-600">Menos</span>
        <div className="flex items-center gap-1">
          {[0,1,2,3,4].map((i) => (
            <div key={i} className={`w-4 h-4 rounded-sm ${INTENSITY_CLASSES[i].split(' ').slice(0,2).join(' ')}`} />
          ))}
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-600">Mais</span>
      </div>

      {/* Maior gasto */}
      {highestDay && Number(highestDay[1]) > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">Maior gasto</span>
          <span className="text-xs font-semibold text-red-500">
            {fmt(Number(highestDay[1]))} — dia {highestDay[0]}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Cards Dashboard Section ───────────────────────────
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

function CardsDashboardSection({ cards, month, year }) {
  const [txs, setTxs]           = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    setLoading(true)
    const daysInMonth = new Date(year, month, 0).getDate()
    transactionsAPI.list({
      start_date: `${year}-${String(month).padStart(2,'0')}-01`,
      end_date:   `${year}-${String(month).padStart(2,'0')}-${daysInMonth}`,
      type: 'expense',
    }).then(res => setTxs(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [month, year])

  const statsPerCard = cards.map(card => {
    const cardTxs    = txs.filter(t => t.card_id === card.id)
    const total      = cardTxs.reduce((s, t) => s + t.amount, 0)
    const byCategory = {}
    cardTxs.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
    })
    return { card, total, byCategory, count: cardTxs.length }
  }).filter(s => s.total > 0 || cards.length <= 3)

  const barData  = statsPerCard.map(s => ({
    name:  `${s.card.bank} •••${s.card.last_four}`,
    total: s.total,
    color: s.card.color,
  }))
  const totalAll = statsPerCard.reduce((s, c) => s + c.total, 0)

  if (cards.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Gastos por Cartão</h2>
        <Link to="/cards" className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
          Gerenciar <ChevronRight size={12} />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : totalAll === 0 ? (
        <div className="card text-center py-6 text-gray-400 dark:text-gray-600 text-sm">
          Nenhum gasto vinculado a cartões em {MONTH_NAMES[month - 1]}/{year}
        </div>
      ) : (
        <>
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
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {count} transaç{count !== 1 ? 'ões' : 'ão'}
                  </p>
                </div>
                {totalAll > 0 && (
                  <div className="text-right flex-shrink-0">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ background: `${card.color}22`, color: card.color }}
                    >
                      {((total / totalAll) * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {statsPerCard.map(({ card, total, byCategory }) =>
            expanded === card.id && Object.keys(byCategory).length > 0 ? (
              <div key={`exp-${card.id}`} className="card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-3 h-3 rounded-full" style={{ background: card.color }} />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    {card.name} — Gastos por Categoria em {MONTH_NAMES[month - 1]}
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(byCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, val]) => {
                      const pct   = total > 0 ? (val / total) * 100 : 0
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
                    })}
                </div>
              </div>
            ) : null
          )}

          {barData.filter(b => b.total > 0).length >= 2 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-4">
                Comparativo de Gastos — {MONTH_NAMES[month - 1]}/{year}
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} barSize={32} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  />
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
        </>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────
export default function Dashboard() {
  const now = new Date()
  const [month, setMonth]       = useState(now.getMonth() + 1)
  const [year, setYear]         = useState(now.getFullYear())
  const [monthly, setMonthly]   = useState(null)
  const [yearly, setYearly]     = useState(null)
  const [recent, setRecent]     = useState([])
  const [budgets, setBudgets]   = useState([])
  const [cards, setCards]       = useState([])
  const [monthTxs, setMonthTxs] = useState([])   // ← todas as txs do mês para o heatmap
  const [loading, setLoading]   = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const lastDay = new Date(year, month, 0).getDate()
      const mm      = String(month).padStart(2, '0')

      const [monthRes, yearRes, recentRes, budgetsRes, cardsRes, monthTxsRes] = await Promise.all([
        transactionsAPI.monthlySummary(year, month),
        transactionsAPI.yearlySummary(year),
        transactionsAPI.list({ start_date: `${year}-01-01` }),
        budgetsAPI.list({ month, year }),
        cardsAPI.list(),
        transactionsAPI.list({ start_date: `${year}-${mm}-01`, end_date: `${year}-${mm}-${lastDay}` }),
      ])

      setMonthly(monthRes.data)
      setYearly(yearRes.data)
      const sorted = (recentRes.data || [])
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)
      setRecent(sorted)
      setBudgets(budgetsRes.data || [])
      setCards(cardsRes.data || [])
      setMonthTxs(monthTxsRes.data || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [month, year])

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const chartData = yearly?.monthly?.map((m) => ({
    name:     MONTH_NAMES[m.month - 1],
    Receitas: m.income,
    Despesas: m.expense,
  })) || []

  const pieData = monthly?.by_category
    ? Object.entries(monthly.by_category).map(([name, value]) => ({ name, value }))
    : []

  const budgetsWithSpent = budgets.map((b) => ({
    budget: b,
    spent:  monthly?.by_category?.[b.category] || 0,
  })).sort((a, b) => {
    const pctA = a.budget.limit_amount > 0 ? (a.spent / a.budget.limit_amount) : 0
    const pctB = b.budget.limit_amount > 0 ? (b.spent / b.budget.limit_amount) : 0
    return pctB - pctA
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Visão geral das suas finanças</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="input-field w-auto text-sm"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="input-field w-auto text-sm"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Saldo do Mês"
              value={fmt(monthly?.balance ?? 0)}
              icon={DollarSign}
              color={monthly?.balance >= 0 ? 'bg-primary-600' : 'bg-red-500'}
            />
            <StatCard
              label="Total Receitas"
              value={fmt(monthly?.total_income ?? 0)}
              icon={TrendingUp}
              color="bg-emerald-500"
            />
            <StatCard
              label="Total Despesas"
              value={fmt(monthly?.total_expense ?? 0)}
              icon={TrendingDown}
              color="bg-red-500"
            />
            <StatCard
              label="Transações"
              value={monthly?.transaction_count ?? 0}
              icon={Hash}
              color="bg-blue-500"
            />
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar chart */}
            <div className="card lg:col-span-2">
              <h2 className="section-title mb-4">Receitas vs Despesas — {year}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={12} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v) => fmt(v)}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="card">
              <h2 className="section-title mb-4">Gastos por Categoria</h2>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-gray-400 dark:text-gray-600 text-sm">
                  Sem despesas no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="45%"
                      innerRadius={50} outerRadius={80}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      contentStyle={{ borderRadius: 12, border: 'none' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Heatmap ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <SpendingHeatmap transactions={monthTxs} month={month} year={year} />
            </div>

            {/* Budgets + Recent lado a lado no espaço restante */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Budget progress */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="section-title">Orçamentos do Mês</h2>
                  <Link
                    to="/budgets"
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    Ver todos <ChevronRight size={12} />
                  </Link>
                </div>
                {budgetsWithSpent.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400 dark:text-gray-600">Nenhum orçamento definido</p>
                    <Link
                      to="/budgets"
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-block"
                    >
                      Criar orçamentos →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {budgetsWithSpent.slice(0, 5).map(({ budget, spent }) => (
                      <BudgetMiniCard key={budget.id} budget={budget} spent={spent} />
                    ))}
                  </div>
                )}
              </div>

              {/* Recent transactions */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="section-title">Últimas Transações</h2>
                  <Link
                    to="/transactions"
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    Ver todas <ChevronRight size={12} />
                  </Link>
                </div>
                {recent.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-600">
                    Nenhuma transação ainda
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recent.map((t) => (
                      <div key={t.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          t.type === 'income'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {t.type === 'income'
                            ? <ArrowUpRight size={14} className="text-emerald-600 dark:text-emerald-400" />
                            : <ArrowDownRight size={14} className="text-red-500 dark:text-red-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {t.description}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {t.category} · {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className={`text-sm font-semibold ${
                          t.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-500 dark:text-red-400'
                        }`}>
                          {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Cartões ── */}
          {cards.length > 0 && (
            <div className="card">
              <CardsDashboardSection cards={cards} month={month} year={year} />
            </div>
          )}

        </div>
      )}
    </div>
  )
}