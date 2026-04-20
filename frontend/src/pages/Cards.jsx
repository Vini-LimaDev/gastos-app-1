import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, CreditCard, X, Check } from 'lucide-react'
import { cardsAPI } from '../api'

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

const defaultForm = {
  name: '', bank: '', last_four: '', color: '#6366f1', card_type: 'credit',
}

// ── Card Visual ───────────────────────────────────────
function CardVisual({ card, small = false }) {
  if (small) {
    return (
      <div
        className="w-16 h-10 rounded-xl flex flex-col justify-between p-2 text-white font-medium shadow-lg select-none flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${card.color}dd, ${card.color}88)` }}
      >
        <div className="flex justify-end">
          <CreditCard size={10} className="opacity-70" />
        </div>
        <span className="text-[8px] opacity-75">{card.last_four}</span>
      </div>
    )
  }

  // Full — altura menor no mobile, maior no desktop
  return (
    <div
      className="w-full h-28 sm:h-36 rounded-xl flex flex-col justify-between p-4 text-white font-medium shadow-lg select-none"
      style={{ background: `linear-gradient(135deg, ${card.color}dd, ${card.color}88)` }}
    >
      <div className="flex justify-between items-start">
        <span className="font-bold text-sm sm:text-base opacity-90 truncate pr-2">{card.name}</span>
        <CreditCard size={18} className="opacity-70 flex-shrink-0" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="tracking-widest text-sm sm:text-base opacity-80">
          •••• •••• •••• {card.last_four}
        </span>
        <span className="text-xs opacity-75">{card.bank}</span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────
export default function Cards() {
  const [cards, setCards]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState(null)
  const [form, setForm]         = useState(defaultForm)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Cartões</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Gerencie seus cartões e vincule às transações
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-sm">
          <Plus size={15} />
          <span className="hidden sm:inline">Novo Cartão</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* ── Lista ── */}
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
          {/* MOBILE: lista compacta com minicard */}
          <div className="sm:hidden card p-0 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
            {cards.map((card) => (
              <div key={card.id} className="flex items-center gap-3 px-4 py-3">
                <CardVisual card={card} small />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{card.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {card.bank} · {card.card_type === 'credit' ? 'Crédito' : 'Débito'} · •••• {card.last_four}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(card)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(card.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: grid com card visual completo */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <div key={card.id} className="card p-4">
                <CardVisual card={card} />
                <div className="mt-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{card.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {card.bank} · {card.card_type === 'credit' ? 'Crédito' : 'Débito'} · •••• {card.last_four}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(card)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(card.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Form modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editCard ? 'Editar Cartão' : 'Novo Cartão'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Preview */}
              <CardVisual card={{ ...form, name: form.name || 'Meu Cartão', bank: form.bank || 'Banco' }} />

              {/* Nome */}
              <div>
                <label className="label">Nome do cartão</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field"
                  placeholder="Ex: Nubank Black, Itaú Visa..."
                  required
                />
              </div>

              {/* Banco */}
              <div>
                <label className="label">Banco</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {Object.keys(BANK_COLORS).map(bank => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => handleBankSelect(bank)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        form.bank === bank
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
                <input
                  value={form.bank}
                  onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}
                  className="input-field"
                  placeholder="Ou digite o nome do banco"
                  required
                />
              </div>

              {/* Últimos 4 dígitos + Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Últimos 4 dígitos</label>
                  <input
                    value={form.last_four}
                    onChange={e => setForm(f => ({ ...f, last_four: e.target.value.replace(/\D/g,'').slice(0,4) }))}
                    className="input-field"
                    placeholder="1234"
                    maxLength={4}
                    required
                  />
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select
                    value={form.card_type}
                    onChange={e => setForm(f => ({ ...f, card_type: e.target.value }))}
                    className="input-field"
                  >
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
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className="w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center"
                      style={{
                        background: color,
                        borderColor: form.color === color ? '#fff' : 'transparent',
                        outline: form.color === color ? `2px solid ${color}` : 'none',
                      }}
                    >
                      {form.color === color && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-7 h-7 rounded-full cursor-pointer border border-gray-200 dark:border-gray-700"
                    title="Cor personalizada"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Salvando...' : editCard ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
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