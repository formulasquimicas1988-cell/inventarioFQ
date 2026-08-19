// Impresión de tickets y comprobantes (ventana 80mm).
// Compartido entre la Caja y la sección de Apartados.

const estiloBase = `
  @page{size:80mm auto;margin:0}
  @media print{body{margin:0;padding:0}}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:monospace;font-size:12px;line-height:1.3}
  .ticket{width:64mm;margin:0 auto;padding:6mm 3mm 6mm 3mm}
  .center{text-align:center}
  .bold{font-weight:bold}
  .title{font-size:18px;font-weight:bold;margin-bottom:2px}
  .subtitle{font-size:11px;margin-bottom:6px}
  .fecha{font-size:15px;font-weight:bold;margin-bottom:8px}
  .linea{border-top:1px dashed #000;margin:5px 0}
  .fila{width:100%;border-collapse:collapse;margin-bottom:3px}
  .fila td{padding:1px 0;vertical-align:top}
  .fila .izq{text-align:left;width:60%}
  .fila .der{text-align:right;width:40%;padding-right:2mm}
  .totales .izq{text-align:left;width:45%}
  .totales .der{text-align:right;width:55%;padding-right:2mm}
  .producto{font-size:14px;font-weight:bold}
  .detalle{font-size:13px}
  .totales{font-size:15px;font-weight:bold}
  .mensaje{margin-top:12px;font-size:14px;font-weight:bold}
`;

const scriptImpresion = `
  window.onload = function() { setTimeout(() => window.print(), 200); };
  window.onafterprint = function() { window.close(); };
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') window.print();
    if (e.key === 'Escape') window.close();
  });
`;

function abrirVentana(html) {
  const win = window.open('', '_blank', 'width=340,height=600');
  win.document.write(html);
  win.document.close();
}

function fechaHora(fecha) {
  const f = new Date(fecha);
  return {
    fechaStr: f.toLocaleDateString('es-MX', { timeZone: 'America/Tegucigalpa', day: '2-digit', month: '2-digit', year: 'numeric' }),
    horaStr: f.toLocaleTimeString('es-MX', { timeZone: 'America/Tegucigalpa', hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

function filasItems(items) {
  return items.map(i => `
    <table class="fila">
      <tr><td class="izq producto">${i.descripcion}</td></tr>
    </table>
    <table class="fila detalle">
      <tr>
        <td class="izq">${parseFloat(i.cantidad)} x L ${parseFloat(i.precio_unitario).toFixed(2)}</td>
        <td class="der bold">L ${parseFloat(i.subtotal).toFixed(2)}</td>
      </tr>
    </table>
    <div class="linea"></div>
  `).join('');
}

// Ticket de venta
export function imprimirTicket(ticket, esCopia = false) {
  const num = ticket.numero_ticket ?? ticket.id;
  const { fechaStr, horaStr } = fechaHora(ticket.fecha);

  const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>Ticket #${num}</title>
<style>${estiloBase}</style>
</head><body>
<div class="ticket">
  ${esCopia ? `
    <div class="center title">TICKET COPIA</div>
    <div class="center title">(No Válido para entrega)</div>
    <div class="center subtitle">(Ticket original #${num})</div>
  ` : `
    <div class="center title">TICKET #${num}</div>
  `}
  <div class="center fecha">${fechaStr} • ${horaStr}</div>
  ${ticket.nombreCliente ? `<div class="center" style="font-size:13px;font-weight:bold;margin:4px 0;">Cliente: ${ticket.nombreCliente}</div>` : ''}
  <div class="linea"></div>
  ${filasItems(ticket.items)}
  <table class="fila totales">
    <tr><td class="izq">Total:</td><td class="der">L ${parseFloat(ticket.total).toFixed(2)}</td></tr>
  </table>
  ${ticket.efectivo != null ? `
  <table class="fila totales">
    <tr><td class="izq">Efectivo:</td><td class="der">L ${parseFloat(ticket.efectivo).toFixed(2)}</td></tr>
  </table>` : ''}
  ${ticket.cambio != null ? `
  <table class="fila totales">
    <tr><td class="izq">Cambio:</td><td class="der">L ${parseFloat(ticket.cambio).toFixed(2)}</td></tr>
  </table>` : ''}
  <div class="center mensaje">¡Gracias por su compra!<br>¡Vuelva pronto!</div>
</div>
<script>${scriptImpresion}</script>
</body></html>`;

  abrirVentana(html);
}

// Comprobante de apartado (reserva, NO es factura — pendiente de pago)
export function imprimirApartado(apartado) {
  const num = apartado.numero ?? apartado.id;
  const { fechaStr, horaStr } = fechaHora(apartado.fecha);

  const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>Apartado #${num}</title>
<style>${estiloBase}</style>
</head><body>
<div class="ticket">
  <div class="center title">COMPROBANTE</div>
  <div class="center title">DE APARTADO</div>
  <div class="center subtitle">(No es factura — pendiente de pago)</div>
  <div class="center title" style="margin-top:4px;">APARTADO #${num}</div>
  <div class="center fecha">${fechaStr} • ${horaStr}</div>
  <div class="center" style="font-size:13px;font-weight:bold;margin:4px 0;">Cliente: ${apartado.nombreCliente || ''}</div>
  ${apartado.telefono ? `<div class="center" style="font-size:12px;margin-bottom:4px;">Tel: ${apartado.telefono}</div>` : ''}
  <div class="linea"></div>
  ${filasItems(apartado.items)}
  <table class="fila totales">
    <tr><td class="izq">Total:</td><td class="der">L ${parseFloat(apartado.total).toFixed(2)}</td></tr>
  </table>
  <table class="fila totales">
    <tr><td class="izq">SALDO:</td><td class="der">L ${parseFloat(apartado.total).toFixed(2)}</td></tr>
  </table>
  <div class="center mensaje">Producto reservado.<br>Pague el total al retirar.</div>
</div>
<script>${scriptImpresion}</script>
</body></html>`;

  abrirVentana(html);
}
