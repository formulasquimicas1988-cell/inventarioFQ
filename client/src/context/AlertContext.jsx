import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const AlertContext = createContext(null)

export function AlertProvider({ children }) {
  const [criticosCount, setCriticosCount] = useState(0)
  const [criticosData, setCriticosData] = useState([])

  const refreshAlertas = useCallback(async () => {
    try {
      const res = await api.get('/api/alertas/criticos')
      const data = Array.isArray(res.data) ? res.data : []
      setCriticosData(data)
      setCriticosCount(data.length)
    } catch (err) {
      console.error('AlertContext refresh error:', err)
    }
  }, [])

  useEffect(() => {
    refreshAlertas()
    const interval = setInterval(refreshAlertas, 60000)
    return () => clearInterval(interval)
  }, [refreshAlertas])

  return (
    <AlertContext.Provider value={{ criticosCount, criticosData, refreshAlertas }}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlerts() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlerts must be used within AlertProvider')
  return ctx
}
