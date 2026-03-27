import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ message = 'No se encontraron resultados', icon: Icon = PackageOpen, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Icon className="w-16 h-16 text-slate-300 mb-4" />
      <p className="text-slate-500 text-lg mb-4">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="min-h-[48px] px-6 py-2 bg-brand-red text-white rounded-lg font-medium hover:bg-red-700 active:bg-red-800 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
