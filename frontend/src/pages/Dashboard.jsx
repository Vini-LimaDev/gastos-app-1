import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Hash,
  ArrowUpRight, ArrowDownRight, ChevronRight, AlertTriangle,
} from 'lucide-react'
import { transactionsAPI, budgetsAPI } from '../api'

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const CATEGORY_COLORS = {
  Alimentação: '#f97316',
  Transporte: '#3b82f6',
  Moradia: '#a855f7',
  Saúde: '#ef4444',
  Lazer: '#eab308',
  Educação: '#6366f1',
  Vestuário: '#ec4899',
  Outros: '#6b7280',
}

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

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

function BudgetMiniCard({ budget, spent }) {
  const pct = budget.limit_amount > 0 ? Math.min((spent / budget.limit_amount) * 100, 100) : 0
  const isOver = spent > budget.limit_amount
  const isWarning = !isOver && pct >= 80

  const barColor = isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-primary-500 dark:bg-primary-400'

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1.5">
          {(isOver || isWarning) && <AlertTriangle size={12} className={isOver ? 'text-red-500' : 'text-yellow-500'} />}
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

export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [monthly, setMonthly] = useState(null)
  const [yearly, setYearly] = useState(null)
  const [recent, setRecent] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [monthRes, yearRes, recentRes, budgetsRes] = await Promise.all([
        transactionsAPI.monthlySummary(year, month),
        transactionsAPI.yearlySummary(year),
        transactionsAPI.list({ start_date: `${year}-01-01` }),
        budgetsAPI.list({ month, year }),
      ])
      setMonthly(monthRes.data)
      setYearly(yearRes.data)
      const sorted = (recentRes.data || []).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
      setRecent(sorted)
      setBudgets(budgetsRes.data || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [month, year])

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const chartData = yearly?.monthly?.map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    Receitas: m.income,
    Despesas: m.expense,
  })) || []

  const pieData = monthly?.by_category
    ? Object.entries(monthly.by_category).map(([name, value]) => ({ name, value }))
    : []

  const budgetsWithSpent = budgets.map((b) => ({
    budget: b,
    spent: monthly?.by_category?.[b.category] || 0,
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
          {/* Stat cards */}
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

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar chart */}
            <div className="card lg:col-span-2">
              <h2 className="section-title mb-4">Receitas vs Despesas — {year}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={12} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="card">
              <h2 className="section-title mb-4">Gastos por Categoria</h2>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-gray-400 dark:text-gray-600 text-sm">Sem despesas no período</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Budgets + Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Budget progress */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Orçamentos do Mês</h2>
                <Link to="/budgets" className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight size={12} />
                </Link>
              </div>
              {budgetsWithSpent.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400 dark:text-gray-600">Nenhum orçamento definido</p>
                  <Link to="/budgets" className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-block">
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
                <Link to="/transactions" className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
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
                        t.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {t.type === 'income'
                          ? <ArrowUpRight size={14} className="text-emerald-600 dark:text-emerald-400" />
                          : <ArrowDownRight size={14} className="text-red-500 dark:text-red-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.description}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{t.category} · {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
