import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext(null);

const STORAGE_KEY = 'fq_sesion';

function loadSesion() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Migración: si existe la clave vieja (solo nombre), limpiar para forzar re-login
    if (localStorage.getItem('fq_usuario')) {
      localStorage.removeItem('fq_usuario');
    }
    return null;
  } catch {
    return null;
  }
}

export function UserProvider({ children }) {
  const [sesion, setSesionState] = useState(loadSesion);

  // usuario = string nombre (compatibilidad con código existente)
  const usuario = sesion?.nombre || '';
  const rol = sesion?.rol || null;
  const usuarioId = sesion?.id || null;
  const token = sesion?.token || null;

  const setUsuario = (data) => {
    // data puede ser { nombre, rol, id, token } o solo un string (nombre) para compatibilidad
    const nuevo = typeof data === 'string'
      ? { nombre: data, rol: 'almacen', id: null, token: null }
      : { nombre: data.nombre, rol: data.rol || 'almacen', id: data.id || null, token: data.token || null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevo));
    setSesionState(nuevo);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSesionState(null);
  };

  return (
    <UserContext.Provider value={{ usuario, rol, usuarioId, token, setUsuario, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
