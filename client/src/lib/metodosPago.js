// Métodos de pago de una venta. El valor guardado es el `value`; la `label`
// es lo que se muestra en pantalla (historial, ventas, etc.). NO va en el ticket.
export const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta crédito' },
  { value: 'credito', label: 'Crédito' },
];

const MAPA = Object.fromEntries(METODOS_PAGO.map(m => [m.value, m.label]));

// Etiqueta legible de un método. Si viene vacío/desconocido asume efectivo.
export function labelMetodoPago(metodo) {
  return MAPA[metodo] || 'Efectivo';
}

// Color del monto según el método: efectivo verde, transferencia azul,
// tarjeta amarillo, crédito rojo. (Clases literales para que Tailwind las incluya.)
const COLORES = {
  efectivo: 'text-emerald-600',
  transferencia: 'text-blue-600',
  tarjeta: 'text-amber-500',
  credito: 'text-red-600',
};

export function colorMetodoPago(metodo) {
  return COLORES[metodo] || COLORES.efectivo;
}
