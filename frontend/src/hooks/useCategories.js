import { useState, useEffect, useCallback } from 'react'
import { categoriesAPI } from '../api'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await categoriesAPI.list()
      setCategories(res.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Mapa name → { color, icon } para uso nos badges
  const categoryMap = Object.fromEntries(
    categories.map(c => [c.name, { color: c.color, icon: c.icon }])
  )

  return { categories, categoryMap, loading, reload: load }
}