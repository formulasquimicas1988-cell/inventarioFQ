/**
 * Devuelve la fecha/hora actual en Honduras (UTC-6) como string MySQL DATETIME.
 * Formato: 'YYYY-MM-DD HH:MM:SS'
 *
 * Funciona porque process.env.TZ = 'America/Tegucigalpa' se fija en server/index.js
 * antes de cualquier require, por lo que los métodos locales de Date (getHours, etc.)
 * ya reflejan la hora de Honduras — sin depender de NOW() ni CONVERT_TZ en MySQL.
 */
function nowHN() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

module.exports = { nowHN };
