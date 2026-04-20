import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { categoriesAPI } from '../api'
import { useCategories } from '../hooks/useCategories'

const COLOR_OPTIONS = ['#f97316','#3b82f6','#a855f7','#ef4444','#eab308','#6366f1','#ec4899','#6b7280','#10b981','#14b8a6','#f43f5e','#8b5cf6']

export default function Categories() {
  const { categories, loading, reload } = useCategories()
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState(null)
  const [deleteId, setDeleteId]   = useState(null)
  const [form, setForm]           = useState({ name: '', color: '#6366f1', icon: '🏷️' })
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef(null)

  const customs  = categories.filter(c => !c.is_default)
  const defaults = categories.filter(c => c.is_default)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false)
    }
    if (showPicker) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPicker])

  const openCreate = () => {
    setEditId(null); setForm({ name: '', color: '#6366f1', icon: '🏷️' })
    setError(''); setShowPicker(false); setShowForm(true)
  }

  const openEdit = (cat) => {
    setEditId(cat.id); setForm({ name: cat.name, color: cat.color, icon: cat.icon })
    setError(''); setShowPicker(false); setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Informe um nome')
    setSaving(true); setError('')
    try {
      if (editId) await categoriesAPI.update(editId, { color: form.color, icon: form.icon })
      else        await categoriesAPI.create(form)
      setShowForm(false); reload()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await categoriesAPI.delete(deleteId)
    setDeleteId(null); reload()
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Categorias</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Gerencie suas categorias
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-sm flex-shrink-0">
          <Plus size={15} />
          <span className="hidden sm:inline">Nova Categoria</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>

      {/* ── Categorias Padrão ── */}
      <div className="card mb-4 sm:mb-6">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Categorias Padrão
        </h2>
        <div className="flex flex-wrap gap-2">
          {defaults.map(cat => (
            <span
              key={cat.name}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium text-white"
              style={{ backgroundColor: cat.color }}
            >
              {cat.icon} {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* ── Categorias Customizadas ── */}
      <div className="card">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Minhas Categorias ({customs.length})
        </h2>
        {loading ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : customs.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
            Nenhuma categoria personalizada ainda. Crie a primeira!
          </p>
        ) : (
          <div className="space-y-2">
            {customs.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: cat.color + '30', border: `2px solid ${cat.color}` }}
                >
                  {cat.icon}
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200 flex-1 min-w-0 truncate text-sm">
                  {cat.name}
                </span>
                {/* hex color — esconde no mobile pra economizar espaço */}
                <span
                  className="hidden sm:inline text-xs px-2 py-0.5 rounded-full text-white flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.color}
                </span>
                {/* bolinha de cor no mobile */}
                <span
                  className="sm:hidden w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteId(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Criar/Editar ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editId ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button onClick={() => { setShowForm(false); setShowPicker(false) }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>
            )}

            <div>
              <label className="label">Nome</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                disabled={!!editId}
                className="input-field disabled:opacity-50"
                placeholder="Ex: Academia, Pets, Streaming..."
                maxLength={50}
              />
            </div>

            <div>
              <label className="label">Ícone</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPicker(p => !p)}
                  className="w-14 h-14 rounded-xl text-2xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 transition-all"
                  title="Escolher emoji"
                >
                  {form.icon}
                </button>
                <span className="text-sm text-gray-400">Clique para escolher</span>
              </div>
              {showPicker && (
                <div ref={pickerRef} className="absolute z-[60] mt-2" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <Picker
                    data={data}
                    locale="pt"
                    onEmojiSelect={(emoji) => { setForm({ ...form, icon: emoji.native }); setShowPicker(false) }}
                    theme="auto"
                    previewPosition="none"
                    skinTonePosition="none"
                    perLine={11}
                    emojiSize={20}
                    emojiButtonSize={28}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="label">Cor</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                    style={{ backgroundColor: c, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                className="w-full h-10 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Preview:</span>
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: form.color }}
              >
                {form.icon} {form.name || 'Categoria'}
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowForm(false); setShowPicker(false) }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Salvando...' : <><Check size={15} className="inline mr-1" />{editId ? 'Salvar' : 'Criar'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Delete ── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Excluir categoria?</h3>
            <p className="text-sm text-gray-500">Transações existentes com essa categoria não serão afetadas.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleDelete} className="btn-danger flex-1">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}