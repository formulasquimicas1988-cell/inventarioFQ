/**
 * Format a date string to "DD/MM/YYYY hh:mm AM/PM" in Spanish 12h format
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-MX', {
      timeZone: 'America/Tegucigalpa',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

/**
 * Format a number with specified decimal places
 */
export function formatNumber(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return parseFloat(n).toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Get stock status based on actual vs minimum stock
 * critico = stock_actual < stock_minimo
 * bajo    = stock_actual <= stock_minimo * 1.5
 * ok      = otherwise
 */
export function getStockStatus(stockActual, stockMinimo) {
  const actual = parseFloat(stockActual) || 0;
  const minimo = parseFloat(stockMinimo) || 0;
  if (actual < minimo) return 'critico';
  if (actual <= minimo * 1.5) return 'bajo';
  return 'ok';
}

/**
 * Get Tailwind badge classes for stock status
 */
export function getStockBadge(stockActual, stockMinimo) {
  const status = getStockStatus(stockActual, stockMinimo);
  if (status === 'critico') return 'bg-red-100 text-red-800 border border-red-200';
  if (status === 'bajo') return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  return 'bg-green-100 text-green-800 border border-green-200';
}

/**
 * Normaliza texto para búsqueda: quita acentos/diacríticos, pasa a minúsculas
 * y recorta espacios. "Galón" → "galon", "NIÑO" → "nino".
 */
export function normalizarTexto(str) {
  return (str ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimina acentos y diacríticos
    .toLowerCase()
    .trim();
}

/**
 * Compara una búsqueda contra uno o más campos ignorando acentos, mayúsculas y
 * orden de palabras. La búsqueda se parte en palabras y TODAS deben aparecer
 * (en cualquier campo, en cualquier orden). Así "galon usado" encuentra
 * "Galones usados".
 */
export function coincideBusqueda(query, ...campos) {
  const q = normalizarTexto(query);
  if (!q) return true;
  const texto = normalizarTexto(campos.filter(Boolean).join(' '));
  return q.split(/\s+/).every((palabra) => texto.includes(palabra));
}

/**
 * Combine class names, filtering falsy values
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Debounce a function by delay ms
 */
export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
