    import { useState, useRef, useCallback } from 'react'
    import {
    X, Upload, Sparkles, Check, AlertCircle,
    Loader2, ImageIcon, ChevronRight, RotateCcw,
    } from 'lucide-react'
    import { transactionsAPI } from '../api'

    // ── Constantes ────────────────────────────────────────────────────────────────
    const CATEGORIES = [
    'Alimentação', 'Transporte', 'Moradia', 'Saúde',
    'Lazer', 'Educação', 'Vestuário', 'Outros',
    ]

    const fmt = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

    const ANALYSIS_PROMPT = `Você é um assistente especializado em análise de faturas de cartão de crédito brasileiras.

    Analise esta imagem de fatura de cartão de crédito e extraia TODOS os lançamentos/transações visíveis.

    Para cada lançamento, identifique:
    - description: nome/descrição do estabelecimento ou serviço
    - amount: valor em reais (número positivo, sem símbolo de moeda)
    - date: data no formato YYYY-MM-DD (se o ano não estiver visível, use o ano atual)
    - category: classifique em UMA das seguintes categorias exatas: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Vestuário, Outros

    Regras importantes:
    - Ignore linhas de pagamento, crédito, ajuste e saldo anterior — inclua apenas compras/despesas reais
    - Se a data tiver só dia e mês, use o ano do período da fatura ou o ano atual
    - Valores devem ser números decimais (ex: 49.90, não "R$ 49,90")
    - Se houver parcelas, inclua apenas a parcela da fatura atual

    Responda SOMENTE com um JSON válido, sem texto adicional, sem markdown, sem backticks:
    {
    "transactions": [
        {
        "description": "Nome do estabelecimento",
        "amount": 49.90,
        "date": "2025-01-15",
        "category": "Alimentação"
        }
    ],
    "period": "Janeiro 2025",
    "total": 0.00
    }`

    // ── Helpers ───────────────────────────────────────────────────────────────────
    function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
    }

    async function analyzeInvoice(base64Image, mediaType) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada no .env do frontend')

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

        const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        contents: [
            {
            parts: [
                {
                inline_data: {
                    mime_type: mediaType,
                    data: base64Image,
                },
                },
                { text: ANALYSIS_PROMPT },
            ],
            },
        ],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
        },
        }),
    })

    if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Erro na API Gemini: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    try {
        return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
        throw new Error('Gemini não conseguiu extrair os dados da imagem. Tente um print mais nítido.')
    }
    }

    // ── Etapa 1: Upload ───────────────────────────────────────────────────────────
    function StepUpload({ onFileSelect }) {
    const inputRef = useRef()
    const [dragging, setDragging] = useState(false)

    const handleFile = (file) => {
        if (!file) return
        if (!file.type.startsWith('image/')) {
        alert('Por favor, envie uma imagem (PNG, JPG, etc.)')
        return
        }
        onFileSelect(file)
    }

    const onDrop = useCallback((e) => {
        e.preventDefault()
        setDragging(false)
        handleFile(e.dataTransfer.files[0])
    }, [])

    return (
        <div className="p-6 space-y-4">
        <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`
            border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4
            cursor-pointer transition-all select-none
            ${dragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }
            `}
        >
            <div className={`p-4 rounded-2xl ${dragging ? 'bg-primary-100 dark:bg-primary-800/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <ImageIcon size={32} className={dragging ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'} />
            </div>
            <div className="text-center">
            <p className="font-semibold text-gray-800 dark:text-gray-200">
                Arraste o print da fatura aqui
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ou clique para selecionar — PNG, JPG, WEBP
            </p>
            </div>
            <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
            />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex gap-3">
            <Sparkles size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            O Gemini vai identificar automaticamente todos os lançamentos, sugerir categorias e extrair os valores. Você revisará tudo antes de importar.
            </p>
        </div>
        </div>
    )
    }

    // ── Etapa 2: Analisando ───────────────────────────────────────────────────────
    function StepAnalyzing({ previewUrl }) {
    return (
        <div className="p-6 space-y-6">
        <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 max-h-56">
            <img src={previewUrl} alt="Fatura" className="w-full h-56 object-cover" />
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="text-white animate-spin" />
            <p className="text-white font-semibold text-sm">Analisando com Gemini...</p>
            <p className="text-white/70 text-xs">Identificando lançamentos e categorias</p>
            </div>
        </div>
        </div>
    )
    }

    // ── Etapa 3: Revisão ──────────────────────────────────────────────────────────
    function StepReview({ previewUrl, result, onImport, onReset, importing }) {
    const [items, setItems] = useState(() =>
        (result.transactions || []).map((t, i) => ({ ...t, id: i, selected: true }))
    )

    const toggle = (id) =>
        setItems((prev) => prev.map((it) => it.id === id ? { ...it, selected: !it.selected } : it))

    const update = (id, field, value) =>
        setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it))

    const toggleAll = () => {
        const allSelected = items.every((it) => it.selected)
        setItems((prev) => prev.map((it) => ({ ...it, selected: !allSelected })))
    }

    const selectedItems = items.filter((it) => it.selected)
    const total = selectedItems.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)

    return (
        <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
        <div className="px-6 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 shrink-0">
            <img
            src={previewUrl}
            alt="Fatura"
            className="w-14 h-14 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
            />
            <div>
            {result.period && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                Período: <span className="font-medium text-gray-700 dark:text-gray-300">{result.period}</span>
                </p>
            )}
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                {items.length} lançamento{items.length !== 1 ? 's' : ''} identificado{items.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedItems.length} selecionado{selectedItems.length !== 1 ? 's' : ''} · {fmt(total)}
            </p>
            </div>
            <button
            onClick={onReset}
            title="Usar outra imagem"
            className="ml-auto p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
            <RotateCcw size={15} />
            </button>
        </div>

        <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80 backdrop-blur-sm z-10">
                <tr>
                <th className="px-4 py-2.5 w-10">
                    <input
                    type="checkbox"
                    checked={items.length > 0 && items.every((it) => it.selected)}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-primary-600 rounded cursor-pointer"
                    />
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Descrição</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Data</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Categoria</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Valor</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item) => (
                <tr
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`cursor-pointer transition-colors ${
                    item.selected
                        ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        : 'bg-gray-50/50 dark:bg-gray-900/30 opacity-50 hover:opacity-70'
                    }`}
                >
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggle(item.id)}
                        className="w-4 h-4 accent-primary-600 rounded cursor-pointer"
                    />
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                        value={item.description}
                        onChange={(e) => update(item.id, 'description', e.target.value)}
                        className="w-full bg-transparent text-gray-800 dark:text-gray-200 text-xs outline-none focus:ring-1 focus:ring-primary-400 rounded px-1 py-0.5"
                        disabled={!item.selected}
                    />
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="date"
                        value={item.date}
                        onChange={(e) => update(item.id, 'date', e.target.value)}
                        className="bg-transparent text-gray-700 dark:text-gray-300 text-xs outline-none focus:ring-1 focus:ring-primary-400 rounded px-1 py-0.5 w-28"
                        disabled={!item.selected}
                    />
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <select
                        value={item.category}
                        onChange={(e) => update(item.id, 'category', e.target.value)}
                        className="bg-transparent text-gray-700 dark:text-gray-300 text-xs outline-none focus:ring-1 focus:ring-primary-400 rounded px-1 py-0.5 cursor-pointer"
                        disabled={!item.selected}
                    >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    </td>
                    <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.amount}
                        onChange={(e) => update(item.id, 'amount', e.target.value)}
                        className="bg-transparent text-red-500 dark:text-red-400 text-xs font-medium outline-none focus:ring-1 focus:ring-primary-400 rounded px-1 py-0.5 text-right w-20"
                        disabled={!item.selected}
                    />
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 shrink-0 bg-white dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
            Total selecionado:{' '}
            <span className="font-semibold text-red-500 dark:text-red-400">{fmt(total)}</span>
            </div>
            <button
            onClick={() => onImport(selectedItems)}
            disabled={selectedItems.length === 0 || importing}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
            {importing ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {importing ? 'Importando...' : `Importar ${selectedItems.length} lançamento${selectedItems.length !== 1 ? 's' : ''}`}
            </button>
        </div>
        </div>
    )
    }

    // ── Componente principal ──────────────────────────────────────────────────────
    export default function InvoiceImport({ onClose, onSuccess }) {
    const [step, setStep] = useState('upload')
    const [previewUrl, setPreviewUrl] = useState(null)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')
    const [importing, setImporting] = useState(false)
    const [importedCount, setImportedCount] = useState(0)

    const handleFileSelect = async (selectedFile) => {
        setPreviewUrl(URL.createObjectURL(selectedFile))
        setError('')
        setStep('analyzing')

        try {
        const base64 = await fileToBase64(selectedFile)
        const parsed = await analyzeInvoice(base64, selectedFile.type)
        if (!parsed.transactions || parsed.transactions.length === 0) {
            throw new Error('Nenhum lançamento encontrado na imagem. Tente um print mais legível.')
        }
        setResult(parsed)
        setStep('review')
        } catch (err) {
        setError(err.message || 'Erro ao analisar imagem')
        setStep('upload')
        }
    }

    const handleReset = () => {
        setPreviewUrl(null)
        setResult(null)
        setError('')
        setStep('upload')
    }

    const handleImport = async (selectedItems) => {
        setImporting(true)
        let count = 0
        for (const item of selectedItems) {
        try {
            await transactionsAPI.create({
            description: item.description,
            amount: parseFloat(item.amount),
            type: 'expense',
            category: item.category,
            date: item.date,
            notes: 'Importado via leitura de fatura',
            })
            count++
        } catch (err) {
            console.error('Erro ao importar lançamento:', err)
        }
        }
        setImportedCount(count)
        setImporting(false)
        setStep('done')
        onSuccess?.()
    }

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30">
                <Sparkles size={16} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Importar Fatura
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                    {step === 'upload'    && 'Envie o print da fatura de cartão'}
                    {step === 'analyzing' && 'Gemini está lendo sua fatura...'}
                    {step === 'review'    && 'Revise e selecione os lançamentos'}
                    {step === 'done'      && 'Importação concluída!'}
                </p>
                </div>
            </div>

            {/* Stepper */}
            <div className="hidden sm:flex items-center gap-1.5 mr-4">
                {['upload', 'analyzing', 'review'].map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === s || (step === 'done' && s === 'review')
                        ? 'bg-primary-600 text-white'
                        : (step === 'analyzing' && i === 0) || (step === 'review' && i < 2) || step === 'done'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}>
                    {((step === 'review' && i < 2) || step === 'done') ? <Check size={12} /> : i + 1}
                    </div>
                    {i < 2 && <ChevronRight size={12} className="text-gray-300 dark:text-gray-600" />}
                </div>
                ))}
            </div>

            <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
                <X size={18} />
            </button>
            </div>

            {/* Erro */}
            {error && (
            <div className="mx-6 mt-4 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
            </div>
            )}

            {step === 'upload'    && <StepUpload onFileSelect={handleFileSelect} />}
            {step === 'analyzing' && <StepAnalyzing previewUrl={previewUrl} />}
            {step === 'review'    && (
            <StepReview
                previewUrl={previewUrl}
                result={result}
                onImport={handleImport}
                onReset={handleReset}
                importing={importing}
            />
            )}
            {step === 'done' && (
            <div className="p-10 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check size={28} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {importedCount} lançamento{importedCount !== 1 ? 's' : ''} importado{importedCount !== 1 ? 's' : ''}!
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    As transações já aparecem na sua lista.
                </p>
                </div>
                <div className="flex gap-3 mt-2">
                <button onClick={handleReset} className="btn-secondary">Importar outra fatura</button>
                <button onClick={onClose} className="btn-primary">Concluir</button>
                </div>
            </div>
            )}
        </div>
        </div>
    )
    }