import { useState } from 'react'
import { usePlan } from '../hooks/usePlan'
import { paymentsAPI } from '../api'
import { CheckCircle, Zap, Clock, XCircle, Loader, MessageCircle } from 'lucide-react'

export default function Planos() {
  const { plan, isPro, isBasic, isTrial, daysLeft, loading, refetch } = usePlan()
  const [subscribing, setSubscribing] = useState(null) // 'basic' | 'pro' | null
  const [error, setError] = useState('')

  const params = new URLSearchParams(window.location.search)
  const justSubscribed = params.get('status') === 'success'
  const subscribedPlan = params.get('plan') // 'basic' | 'pro'

  const handleSubscribe = async (planType) => {
    setSubscribing(planType)
    setError('')
    try {
      const res = await paymentsAPI.createSubscription(planType)
      window.location.href = res.data.checkout_url
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao iniciar assinatura. Tente novamente.')
      setSubscribing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-blue-500" size={32} />
      </div>
    )
  }

  const planLabel = {
    trial:   `Período gratuito — ${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`,
    basic:   'Plano Basic ativo',
    pro:     'Plano Pro ativo',
    expired: 'Período gratuito encerrado',
  }

  const planDesc = {
    trial:   'Aproveite todas as funcionalidades durante o período de teste',
    basic:   'Você tem acesso a todas as funcionalidades do app',
    pro:     'Você tem acesso completo, incluindo o assistente de WhatsApp com IA',
    expired: 'Assine um plano para continuar usando todas as funcionalidades',
  }

  const planIcon = {
    trial:   <Clock className="text-blue-500" size={20} />,
    basic:   <Zap className="text-blue-500" size={20} />,
    pro:     <Zap className="text-yellow-500" size={20} />,
    expired: <XCircle className="text-red-400" size={20} />,
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">

      {/* Banner de sucesso */}
      {justSubscribed && (
        <div className="mb-8 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3">
          <CheckCircle className="text-green-500" size={22} />
          <p className="text-green-700 dark:text-green-400 font-medium">
            Assinatura confirmada! Bem-vindo ao GastosApp {subscribedPlan === 'pro' ? 'Pro' : 'Basic'} 🎉
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Planos</h1>
        <p className="text-gray-500 dark:text-gray-400">Gerencie sua assinatura do GastosApp</p>
      </div>

      {/* Status atual */}
      <div className="mb-8 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
        {planIcon[plan] || planIcon.expired}
        <div>
          <p className="font-semibold text-gray-800 dark:text-gray-100">
            {planLabel[plan] || planLabel.expired}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {planDesc[plan] || planDesc.expired}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Trial / Expirado */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300">Gratuito</h2>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">R$ 0</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">30 dias de trial</p>
          </div>
          <ul className="space-y-2 mb-6">
            {[
              'Transações ilimitadas',
              'Dashboard e gráficos',
              'Categorias personalizadas',
              'Orçamentos por categoria',
              'Metas financeiras',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle size={14} className="text-gray-400 flex-shrink-0" /> {f}
              </li>
            ))}
            {[
              'Import de faturas',
              'Transações recorrentes',
              'WhatsApp IA',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-600 line-through">
                <XCircle size={14} className="text-gray-300 dark:text-gray-700 flex-shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <div className="w-full text-center py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-medium">
            {isTrial ? `${daysLeft} dias restantes` : 'Expirado'}
          </div>
        </div>

        {/* Basic */}
        <div className={`rounded-2xl border-2 p-6 bg-white dark:bg-gray-900 relative ${
          isBasic ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'
        }`}>
          {isBasic && (
            <div className="absolute top-4 right-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              ATUAL
            </div>
          )}
          <div className="mb-4">
            <h2 className="text-lg font-bold text-blue-600 dark:text-blue-400">Basic</h2>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">R$ 9,90</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">por mês</p>
          </div>
          <ul className="space-y-2 mb-6">
            {[
              'Tudo do plano gratuito',
              'Import de faturas (foto IA)',
              'Transações recorrentes',
              'Import de extrato (CSV/OFX)',
              'Suporte por e-mail',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle size={14} className="text-blue-500 flex-shrink-0" /> {f}
              </li>
            ))}
            <li className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-600 line-through">
              <XCircle size={14} className="text-gray-300 dark:text-gray-700 flex-shrink-0" /> WhatsApp IA
            </li>
          </ul>
          {isBasic ? (
            <div className="w-full text-center py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-semibold">
              ✓ Plano atual
            </div>
          ) : (
            <button
              onClick={() => handleSubscribe('basic')}
              disabled={!!subscribing}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {subscribing === 'basic'
                ? <><Loader size={15} className="animate-spin" /> Aguarde...</>
                : 'Assinar Basic'
              }
            </button>
          )}
        </div>

        {/* Pro */}
        <div className={`rounded-2xl border-2 p-6 bg-white dark:bg-gray-900 relative ${
          isPro ? 'border-yellow-400' : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className={`absolute top-4 right-4 text-white text-xs font-bold px-3 py-1 rounded-full ${
            isPro ? 'bg-yellow-400' : 'bg-gray-400 dark:bg-gray-600'
          }`}>
            {isPro ? 'ATUAL' : 'PREMIUM'}
          </div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-yellow-500 dark:text-yellow-400">Pro</h2>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">R$ 19,90</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">por mês</p>
          </div>
          <ul className="space-y-2 mb-6">
            {[
              'Tudo do plano Basic',
              'Assistente IA no WhatsApp',
              'Lançamentos por mensagem',
              'Suporte prioritário',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle size={14} className="text-yellow-500 flex-shrink-0" /> {f}
              </li>
            ))}
          </ul>
          {isPro ? (
            <div className="w-full text-center py-2 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 text-sm font-semibold">
              ✓ Plano atual
            </div>
          ) : (
            <button
              onClick={() => handleSubscribe('pro')}
              disabled={!!subscribing}
              className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {subscribing === 'pro'
                ? <><Loader size={15} className="animate-spin" /> Aguarde...</>
                : 'Assinar Pro'
              }
            </button>
          )}
        </div>

      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
        Pagamento seguro via Mercado Pago · Cancele quando quiser
      </p>
    </div>
  )
}