import { usePlan } from '../hooks/usePlan'
import { useNavigate } from 'react-router-dom'
import { Zap, MessageCircle } from 'lucide-react'

// Guard para features Basic+ (import, recorrência)
export function FeatureGuard({ children }) {
  const { canUseFeatures, loading } = usePlan()
  const navigate = useNavigate()

  if (loading) return null

  if (!canUseFeatures) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
          <Zap className="text-blue-500" size={28} />
        </div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
          Funcionalidade Premium
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs">
          Esta funcionalidade está disponível nos planos Basic e Pro. Seu período gratuito encerrou.
        </p>
        <button
          onClick={() => navigate('/planos')}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition"
        >
          Ver planos
        </button>
      </div>
    )
  }

  return children
}

// Guard para WhatsApp IA — exclusivo Pro
export function WhatsappGuard({ children }) {
  const { canUseWhatsapp, loading } = usePlan()
  const navigate = useNavigate()

  if (loading) return null

  if (!canUseWhatsapp) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
          <MessageCircle className="text-green-500" size={28} />
        </div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
          Exclusivo Plano Pro
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs">
          O assistente de WhatsApp com IA está disponível apenas no plano Pro.
        </p>
        <button
          onClick={() => navigate('/planos')}
          className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition"
        >
          Fazer upgrade para Pro
        </button>
      </div>
    )
  }

  return children
}

// Mantém export default para não quebrar o Recurring.jsx
export default FeatureGuard