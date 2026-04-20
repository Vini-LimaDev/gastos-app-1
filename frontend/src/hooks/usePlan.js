import { useState, useEffect, useCallback } from 'react'
import { paymentsAPI } from '../api'

export function usePlan() {
  const [plan, setPlan]             = useState(null)
  const [trialEndsAt, setTrialEndsAt] = useState(null)
  const [loading, setLoading]       = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await paymentsAPI.getStatus()
      setPlan(res.data.plan)
      setTrialEndsAt(res.data.trial_ends_at)
    } catch {
      setPlan('expired')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0

  const isTrial   = plan === 'trial'
  const isBasic   = plan === 'basic'
  const isPro     = plan === 'pro'
  const isExpired = plan === 'expired'

  // Basic, Pro têm acesso às features avançadas (import, recorrência)
  const canUseFeatures = loading ? null : (isBasic || isPro)
  
  // Só Pro tem acesso ao WhatsApp IA
  const canUseWhatsapp = loading ? null : isPro

  return {
    plan,
    isTrial,
    isBasic,
    isPro,
    isExpired,
    canUseFeatures,
    canUseWhatsapp,
    daysLeft,
    loading,
    refetch: fetchStatus,
  }
}