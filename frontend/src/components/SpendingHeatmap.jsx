// frontend/src/components/SpendingHeatmap.jsx
// Mapa de calor de gastos do mês — plug & play no Dashboard.jsx
//
// COMO USAR no Dashboard.jsx:
//   1. import SpendingHeatmap from '../components/SpendingHeatmap'
//   2. Passe as transações já carregadas:
//      <SpendingHeatmap transactions={allTransactions} month={month} year={year} />
//      onde `allTransactions` são TODAS as transações do mês (já que você faz
//      transactionsAPI.list({ start_date: `${year}-01-01` }) no load(), basta
//      filtrar pelo mês/ano ou usar o fetch existente).
//
// INTEGRAÇÃO RÁPIDA no Dashboard.jsx:
//   No load(), você já tem `recentRes` mas ele só pega 5 itens.
//   Adicione um estado separado `allMonthTxs` e faça:
//     const allMonthTxs = await transactionsAPI.list({
//       start_date: `${year}-${String(month).padStart(2,'0')}-01`,
//       end_date: `${year}-${String(month).padStart(2,'0')}-${lastDay}`,
//       type: 'expense',
//     })
//   Ou simplesmente filtre o array anual que você já tem em `yearly`.

import { useMemo, useState } from 'react'
import { Flame } from 'lucide-react'

const fmt = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Intensidade em 5 níveis: 0 = sem gasto, 1–4 = quartis
function getIntensity(value, max) {
  if (!value || value === 0) return 0
  const pct = value / max
  if (pct <= 0.25) return 1
  if (pct <= 0.5)  return 2
  if (pct <= 0.75) return 3
  return 4
}

const INTENSITY_CLASSES = [
  // 0 - sem gasto
  'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600',
  // 1 - leve
  'bg-red-100 dark:bg-red-900/30 text-red-400',
  // 2 - moderado
  'bg-red-300 dark:bg-red-700/60 text-red-600 dark:text-red-300',
  // 3 - alto
  'bg-red-500 dark:bg-red-600 text-white',
  // 4 - máximo
  'bg-red-700 dark:bg-red-500 text-white font-bold',
]

const WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function SpendingHeatmap({ transactions = [], month, year }) {
  const [tooltip, setTooltip] = useState(null) // { day, amount, x, y }

  // Calcula total gasto por dia do mês
  const { spendByDay, maxDay, totalMonth, highestDay } = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const spendByDay = {}

    for (let d = 1; d <= daysInMonth; d++) spendByDay[d] = 0

    transactions.forEach((t) => {
      if (t.type !== 'expense') return
      const d = new Date(t.date + 'T12:00:00')
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) return
      spendByDay[d.getDate()] = (spendByDay[d.getDate()] || 0) + t.amount
    })

    const values = Object.values(spendByDay)
    const maxDay = Math.max(...values, 1)
    const totalMonth = values.reduce((s, v) => s + v, 0)
    const highestDay = Object.entries(spendByDay).sort((a, b) => b[1] - a[1])[0]

    return { spendByDay, maxDay, totalMonth, highestDay }
  }, [transactions, month, year])

  // Monta grade semana × dia (como calendário)
  const { weeks, firstWeekday, daysInMonth } = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstWeekday = new Date(year, month - 1, 1).getDay() // 0=Dom
    const cells = Array(firstWeekday).fill(null) // células vazias antes do dia 1
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    // Preenche até múltiplo de 7
    while (cells.length % 7 !== 0) cells.push(null)

    const weeks = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

    return { weeks, firstWeekday, daysInMonth }
  }, [month, year])

  const today = new Date()
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year
  const avgDaily = daysInMonth > 0 ? totalMonth / daysInMonth : 0

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
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Média diária: {fmt(avgDaily)}
          </p>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] text-gray-400 dark:text-gray-600 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Grade do mês */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (!day) {
                return <div key={`empty-${wi}-${di}`} className="aspect-square" />
              }
              const amount = spendByDay[day] || 0
              const intensity = getIntensity(amount, maxDay)
              const isToday = isCurrentMonth && today.getDate() === day
              const isFuture = isCurrentMonth && day > today.getDate()

              return (
                <div
                  key={day}
                  className={`
                    aspect-square rounded-md flex items-center justify-center
                    text-[11px] cursor-default select-none transition-transform
                    hover:scale-110 hover:z-10 relative
                    ${isFuture
                      ? 'bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-700'
                      : INTENSITY_CLASSES[intensity]
                    }
                    ${isToday ? 'ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-gray-900' : ''}
                  `}
                  onMouseEnter={(e) => {
                    if (!isFuture) {
                      setTooltip({ day, amount })
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  title={!isFuture && amount > 0 ? `Dia ${day}: ${fmt(amount)}` : `Dia ${day}`}
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
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-sm ${INTENSITY_CLASSES[i].split(' ').slice(0, 2).join(' ')}`}
            />
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