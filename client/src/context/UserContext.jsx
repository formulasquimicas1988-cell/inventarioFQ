import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [usuario, setUsuarioState] = useState(() => localStorage.getItem('fq_usuario') || '');

  const setUsuario = (nombre) => {
    localStorage.setItem('fq_usuario', nombre);
    setUsuarioState(nombre);
  };

  const logout = () => {
    localStorage.removeItem('fq_usuario');
    setUsuarioState('');
  };

  return (
    <UserContext.Provider value={{ usuario, setUsuario, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
