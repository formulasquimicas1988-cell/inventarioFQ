import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

export default function Login() {
  const { setUsuario } = useUser();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Escribe tu nombre para continuar');
      return;
    }
    setUsuario(nombre.trim());
  };

  return (
    <div className="min-h-screen bg-brand-blue flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.ico" alt="Fórmulas Químicas" className="w-16 h-16 rounded-xl mb-4 object-contain" />
          <h1 className="text-xl font-bold text-brand-blue">Fórmulas Químicas</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Inventario</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ¿Quién eres?
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setError(''); }}
              placeholder="Escribe tu nombre..."
              autoFocus
              className="w-full min-h-[48px] px-4 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] bg-brand-red hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
