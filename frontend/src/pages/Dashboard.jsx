import { useState, useEffect } from 'react'
import { transactionsAPI } from '../api'
import { useAuth } from '../hooks/useAuth.jsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react'

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const CATEGORY_COLORS = {
  'Alimentação': '#22c55e', 'Transporte': '#3b82f6', 'Moradia': '#f59e0b',
  'Saúde': '#ef4444', 'Lazer': '#8b5cf6', 'Educação': '#06b6d4',
  'Vestuário': '#ec4899', 'Outros': '#6b7280',
}

function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {typeof value === 'number'
          ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : value}
      </p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }} className="text-sm">
            {p.name}: {Number(p.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [monthlySummary, setMonthlySummary] = useState(null)
  const [yearlySummary, setYearlySummary] = useState(null)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [monthly, yearly, recent] = await Promise.all([
        transactionsAPI.getMonthlySummary(year, month),
        transactionsAPI.getYearlySummary(year),
        transactionsAPI.list({
          start_date: `${year}-${String(month).padStart(2, '0')}-01`,
          end_date: `${year}-${String(month).padStart(2, '0')}-31`,
        }),
      ])
      setMonthlySummary(monthly.data)
      setYearlySummary(yearly.data)
      setRecentTransactions(recent.data.slice(0, 5))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [year, month])

  const categoryData = monthlySummary
    ? Object.entries(monthlySummary.by_category).map(([name, value]) => ({ name, value }))
    : []

  const yearlyData = yearlySummary?.monthly?.map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    Receitas: m.income,
    Despesas: m.expense,
  })) || []

  const currentMonthName = MONTH_NAMES[month - 1]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-600 mt-1">Resumo financeiro do mês</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field w-auto">
            {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field w-auto">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Saldo do Mês" value={monthlySummary?.balance || 0} icon={Wallet}
              color={(monthlySummary?.balance || 0) >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
              subtitle={currentMonthName} />
            <StatCard title="Receitas" value={monthlySummary?.total_income || 0} icon={TrendingUp}
              color="bg-blue-100 text-blue-600" subtitle={`${currentMonthName} / ${year}`} />
            <StatCard title="Despesas" value={monthlySummary?.total_expense || 0} icon={TrendingDown}
              color="bg-red-100 text-red-600" subtitle={`${currentMonthName} / ${year}`} />
            <StatCard title="Transações" value={monthlySummary?.transaction_count || 0} icon={Receipt}
              color="bg-purple-100 text-purple-600" subtitle="no mês" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="card lg:col-span-2">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Receitas vs Despesas — {year}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={yearlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Receitas" fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Despesas por Categoria — {currentMonthName}</h3>
              {categoryData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                        {categoryData.map((entry, index) => (
                          <Cell key={index} fill={CATEGORY_COLORS[entry.name] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2">
                    {categoryData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#6b7280' }} />
                          <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-medium text-gray-800">
                          {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sem despesas neste mês</div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Últimas Transações — {currentMonthName}</h3>
            {recentTransactions.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[t.category] || '#6b7280' }} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t.description}</p>
                        <p className="text-xs text-gray-500">{t.category} · {t.date}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}
                      {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">Sem transações neste mês</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
