import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea una fecha al formato 12h con AM/PM en español
 * Ejemplo: 02/04/2025 03:45 PM
 */
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  let   h    = d.getHours();
  const min  = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${dd}/${mm}/${yyyy} ${String(h).padStart(2, '0')}:${min} ${ampm}`;
}

/**
 * Formatea solo la fecha (sin hora)
 */
export function formatDateOnly(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Formatea un número decimal (elimina .00)
 */
export function formatNumber(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return '0';
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
}

/**
 * Devuelve el label y clase de badge para el tipo de movimiento
 */
export function tipoMovBadge(tipo) {
  switch (tipo) {
    case 'entrada': return { label: 'Entrada', className: 'badge-green' };
    case 'salida':  return { label: 'Salida',  className: 'badge-red' };
    case 'ajuste':  return { label: 'Ajuste',  className: 'badge-blue' };
    case 'dañado':  return { label: 'Dañado',  className: 'badge-yellow' };
    default:        return { label: tipo,      className: 'badge-gray' };
  }
}

/**
 * Trunca texto largo
 */
export function truncate(text, max = 40) {
  if (!text) return '—';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/**
 * Genera el datetime-local value desde una fecha JS
 */
export function toDatetimeLocal(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
