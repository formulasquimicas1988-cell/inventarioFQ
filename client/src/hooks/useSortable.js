import { useState, useMemo } from 'react';

export function useSortable(data, defaultSort = null, defaultDir = 'asc') {
  const [sortKey, setSortKey] = useState(defaultSort);
  const [sortDir, setSortDir] = useState(defaultDir);

  const sorted = useMemo(() => {
    if (!sortKey || !Array.isArray(data)) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      // MySQL devuelve DECIMAL como texto ("45.50"), así que los valores
      // numéricos se comparan como números y no alfabéticamente
      const isNum = (v) => v !== '' && !isNaN(parseFloat(v)) && isFinite(v);
      const cmp = (isNum(av) && isNum(bv))
        ? parseFloat(av) - parseFloat(bv)
        : typeof av === 'string' ? av.localeCompare(bv, 'es') : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return { sorted, sortKey, sortDir, handleSort };
}
