import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function toObj(str) {
  if (!str) return null
  const [year, month, day] = str.split('-').map(Number)
  return { year, month, day }
}
function toStr({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}
function getFirstWeekday(year, month) {
  return new Date(year, month - 1, 1).getDay()
}

export default function DatePicker({ value, onChange, label, required, placeholder = 'Selecionar data' }) {
  const parsed = toObj(value)
  const today  = new Date()

  const [open, setOpen]               = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [viewYear, setViewYear]       = useState(parsed?.year  ?? today.getFullYear())
  const [viewMonth, setViewMonth]     = useState(parsed?.month ?? today.getMonth() + 1)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  const triggerRef  = useRef(null)
  const dropdownRef = useRef(null)

  // Calcula posição do dropdown relativa ao viewport (portal no body)
  const calcPos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropH = 320 // altura estimada do dropdown

    setDropdownPos({
      top:   spaceBelow >= dropH ? rect.bottom + 4 : rect.top - dropH - 4,
      left:  rect.left,
      width: rect.width,
    })
  }, [])

  const openDropdown = () => {
    calcPos()
    setOpen(true)
  }

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (
        triggerRef.current  && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false)
        setShowYearPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Recalcula posição ao rolar ou redimensionar
  useEffect(() => {
    if (!open) return
    const handler = () => calcPos()
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [open, calcPos])

  // Sincroniza view com value externo
  useEffect(() => {
    if (parsed) { setViewYear(parsed.year); setViewMonth(parsed.month) }
  }, [value])

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const selectDay = (day) => {
    onChange(toStr({ year: viewYear, month: viewMonth, day }))
    setOpen(false)
    setShowYearPicker(false)
  }

  const clearDate = (e) => {
    e.stopPropagation()
    onChange('')
  }

  const goToday = () => {
    const d = today.getDate(), m = today.getMonth() + 1, y = today.getFullYear()
    setViewYear(y); setViewMonth(m)
    onChange(toStr({ year: y, month: m, day: d }))
    setOpen(false)
  }

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth)
  const firstWeekday = getFirstWeekday(viewYear, viewMonth)
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isSelected = (d) =>
    parsed && parsed.year === viewYear && parsed.month === viewMonth && parsed.day === d
  const isToday = (d) =>
    today.getFullYear() === viewYear && today.getMonth() + 1 === viewMonth && today.getDate() === d

  const displayValue = parsed
    ? `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/${parsed.year}`
    : ''

  const yearRange = []
  for (let y = today.getFullYear() - 10; y <= today.getFullYear() + 10; y++) yearRange.push(y)

  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top:      dropdownPos.top,
        left:     dropdownPos.left,
        width:    Math.max(dropdownPos.width, 256),
        zIndex:   9999,
      }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
          <ChevronLeft size={15} />
        </button>

        <button type="button" onClick={() => setShowYearPicker(y => !y)}
          className="text-sm font-semibold text-gray-800 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          {MONTHS[viewMonth - 1]} {viewYear}
        </button>

        <button type="button" onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
          <ChevronRight size={15} />
        </button>
      </div>

      {showYearPicker ? (
        <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
          {yearRange.map((y) => (
            <button key={y} type="button"
              onClick={() => { setViewYear(y); setShowYearPicker(false) }}
              className={`text-xs py-1.5 rounded-lg font-medium transition-colors ${
                y === viewYear
                  ? 'bg-primary-600 dark:bg-primary-500 text-white'
                  : y === today.getFullYear()
                    ? 'text-primary-600 dark:text-primary-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}>
              {y}
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Dias da semana */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-xs font-medium text-gray-400 dark:text-gray-600 py-1">{d}</div>
            ))}
          </div>

          {/* Grade */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button type="button" onClick={() => selectDay(day)}
                    className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${
                      isSelected(day)
                        ? 'bg-primary-600 dark:bg-primary-500 text-white'
                        : isToday(day)
                          ? 'text-primary-600 dark:text-primary-400 font-bold ring-1 ring-primary-400 dark:ring-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}>
                    {day}
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* Rodapé */}
          <div className="flex justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={clearDate}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Limpar
            </button>
            <button type="button" onClick={goToday}
              className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline">
              Hoje
            </button>
          </div>
        </>
      )}
    </div>,
    document.body
  ) : null

  return (
    <div className="relative">
      {label && <label className="label">{label}</label>}

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className={`input-field flex items-center justify-between text-left w-full ${
          !displayValue ? 'text-gray-400 dark:text-gray-500' : ''
        }`}
      >
        <span className="text-sm">{displayValue || placeholder}</span>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {displayValue && (
            <span onClick={clearDate}
              className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors text-lg leading-none cursor-pointer px-0.5 -mt-0.5">
              ×
            </span>
          )}
          <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
        </div>
      </button>

      {/* Input oculto para validação nativa do form */}
      <input
        type="text"
        value={value}
        onChange={() => {}}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />

      {dropdown}
    </div>
  )
}