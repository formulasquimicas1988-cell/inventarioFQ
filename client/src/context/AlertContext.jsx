import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const STORAGE_KEY = 'fq_sesion'

const AlertContext = createContext(null)

function hasToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return !!(raw && JSON.parse(raw)?.token)
  } catch {
    return false
  }
}

export function AlertProvider({ children }) {
  const [criticosCount, setCriticosCount] = useState(0)
  const [criticosData, setCriticosData] = useState([])

  const refreshAlertas = useCallback(async () => {
    if (!hasToken()) return
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
