import { useState, useEffect } from 'react'
import { Target, Plus, Trash2, Edit2, Trophy, CheckCircle2, Clock } from 'lucide-react'
import { goalsAPI } from '../api'

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const emojis = ['🏠', '🚗', '✈️', '📱', '💻', '🎓', '💍', '🏖️', '📦', '💰', '🎯', '🌟']

function GoalCard({ goal, onEdit, onDelete, onUpdateProgress }) {
  const pct = goal.target_amount > 0
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0
  const remaining = goal.target_amount - goal.current_amount
  const isCompleted = goal.current_amount >= goal.target_amount
  const deadlineDate = goal.deadline ? new Date(goal.deadline + 'T12:00:00') : null
  const daysLeft = deadlineDate ? Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24)) : null
  const [addValue, setAddValue] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    const newAmount = goal.current_amount + parseFloat(addValue)
    await onUpdateProgress(goal.id, Math.min(newAmount, goal.target_amount))
    setAddValue('')
    setShowAdd(false)
    setSaving(false)
  }

  return (
    <div className={`card ${isCompleted ? 'border-2 border-primary-300 dark:border-primary-700' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{goal.emoji || '🎯'}</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{goal.name}</p>
            {goal.notes && <p className="text-xs text-gray-400 dark:text-gray-500">{goal.notes}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-semibold">
              <Trophy size={13} /> Concluída!
            </span>
          ) : daysLeft !== null ? (
            <span className={`flex items-center gap-1 text-xs font-medium ${
              daysLeft < 30 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
            }`}>
              <Clock size={12} />
              {daysLeft < 0 ? 'Prazo vencido' : `${daysLeft}d restantes`}
            </span>
          ) : null}
          <button onClick={() => onEdit(goal)} className="text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(goal.id)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isCompleted ? 'bg-primary-500 dark:bg-primary-400' : 'bg-blue-500 dark:bg-blue-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm mb-4">
        <span className="text-gray-500 dark:text-gray-400">
          Guardado: <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(goal.current_amount)}</span>
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          Meta: <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(goal.target_amount)}</span>
        </span>
        <span className="font-bold text-blue-600 dark:text-blue-400">{pct.toFixed(0)}%</span>
      </div>

      {!isCompleted && (
        <div>
          {showAdd ? (
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                placeholder={`Até ${fmt(remaining)}`}
                className="input-field text-sm flex-1"
                required
              />
              <button type="submit" disabled={saving} className="btn-primary text-sm px-3">
                {saving ? '...' : 'Adicionar'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-3">
                Cancelar
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full text-sm text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 rounded-lg py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors font-medium"
            >
              + Adicionar valor guardado
            </button>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center justify-center gap-2 py-2 text-primary-600 dark:text-primary-400 text-sm font-semibold">
          <CheckCircle2 size={16} /> Meta alcançada! Parabéns!
        </div>
      )}

      {deadlineDate && (
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-3 text-center">
          Prazo: {deadlineDate.toLocaleDateString('pt-BR')}
        </p>
      )}
    </div>
  )
}

const defaultForm = { name: '', target_amount: '', current_amount: '0', deadline: '', emoji: '🎯', notes: '' }

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await goalsAPI.list()
      setGoals(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditGoal(null)
    setForm(defaultForm)
    setShowForm(true)
  }

  const openEdit = (goal) => {
    setEditGoal(goal)
    setForm({
      name: goal.name,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      deadline: goal.deadline || '',
      emoji: goal.emoji || '🎯',
      notes: goal.notes || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const payload = {
      ...form,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount || 0),
      deadline: form.deadline || null,
    }
    try {
      if (editGoal) {
        await goalsAPI.update(editGoal.id, payload)
      } else {
        await goalsAPI.create(payload)
      }
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar meta')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover esta meta?')) return
    await goalsAPI.delete(id)
    await load()
  }

  const handleUpdateProgress = async (id, newAmount) => {
    await goalsAPI.update(id, { current_amount: newAmount })
    await load()
  }

  const completed = goals.filter((g) => g.current_amount >= g.target_amount)
  const active = goals.filter((g) => g.current_amount < g.target_amount)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Metas de Economia</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {active.length} ativa{active.length !== 1 ? 's' : ''} · {completed.length} concluída{completed.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nova Meta
        </button>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editGoal ? 'Editar Meta' : 'Nova Meta'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>
              )}

              {/* Emoji picker */}
              <div>
                <label className="label">Ícone</label>
                <div className="flex flex-wrap gap-2">
                  {emojis.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setForm({ ...form, emoji: e })}
                      className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                        form.emoji === e
                          ? 'bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-500'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Nome da meta</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Fundo de emergência, Viagem..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Valor da Meta (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={form.target_amount}
                    onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                    className="input-field"
                    placeholder="2.000,00"
                    required
                  />
                </div>
                <div>
                  <label className="label">Já guardei (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.current_amount}
                    onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                    className="input-field"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="label">Prazo (opcional)</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Observações (opcional)</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input-field"
                  placeholder="Contexto ou motivação..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Salvando...' : editGoal ? 'Salvar' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-16">
          <Target size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma meta criada</p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">Crie metas de economia para acompanhar seu progresso</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Em andamento</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {active.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onUpdateProgress={handleUpdateProgress}
                  />
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Concluídas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completed.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onUpdateProgress={handleUpdateProgress}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
