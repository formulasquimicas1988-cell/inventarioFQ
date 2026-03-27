import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, total, limit, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (page > 4) pages.push('...');

    const start = Math.max(2, page - 2);
    const end = Math.min(totalPages - 1, page + 2);

    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 3) pages.push('...');
    pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
      <p className="text-sm text-slate-500">
        Mostrando {from} - {to} de {total} resultados
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="min-h-[48px] w-[48px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {pageNumbers.map((p, idx) =>
          p === '...' ? (
            <span
              key={`ellipsis-${idx}`}
              className="min-h-[48px] w-[48px] flex items-center justify-center text-slate-400 text-sm"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-h-[48px] w-[48px] flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-brand-red text-white'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="min-h-[48px] w-[48px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
