/**
 * Format a date string to "DD/MM/YYYY hh:mm AM/PM" in Spanish 12h format
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-MX', {
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
export function formatNumber(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
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
