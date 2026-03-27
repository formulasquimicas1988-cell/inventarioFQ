import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const AlertContext = createContext({ count: 0, refresh: () => {} });

export function AlertProvider({ children }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/alertas-count');
      setCount(data.count || 0);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    refresh();
    // Refrescar cada 60 segundos
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <AlertContext.Provider value={{ count, refresh }}>
      {children}
    </AlertContext.Provider>
  );
}

export const useAlerts = () => useContext(AlertContext);
