import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onChange, total, pageSize }) {
  if (totalPages <= 1) return null;

  const from = Math.min((page - 1) * pageSize + 1, total);
  const to   = Math.min(page * pageSize, total);

  let start = Math.max(1, page - 2);
  let end   = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);

  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        {from}–{to} de <span className="font-semibold text-gray-700">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button className="btn-icon btn-ghost" onClick={() => onChange(page - 1)} disabled={page === 1}>
          <ChevronLeft size={18} />
        </button>

        {start > 1 && (
          <>
            <button className="btn-icon btn-ghost" onClick={() => onChange(1)}>1</button>
            {start > 2 && <span className="px-1 text-gray-400 text-sm">…</span>}
          </>
        )}

        {pages.map(p => (
          <button
            key={p}
            onClick={() => p !== page && onChange(p)}
            className={`btn-icon ${p === page ? 'bg-deep-blue text-white hover:bg-deep-blue' : 'btn-ghost'}`}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-gray-400 text-sm">…</span>}
            <button className="btn-icon btn-ghost" onClick={() => onChange(totalPages)}>{totalPages}</button>
          </>
        )}

        <button className="btn-icon btn-ghost" onClick={() => onChange(page + 1)} disabled={page === totalPages}>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
