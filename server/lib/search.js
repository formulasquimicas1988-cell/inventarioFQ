/**
 * Construye un WHERE de búsqueda tolerante a varias palabras y orden.
 *
 * La búsqueda se parte en palabras y se exige que TODAS aparezcan (en cualquiera
 * de las columnas indicadas, en cualquier orden). Los acentos ya los ignora la
 * collation de la base (utf8mb4_0900_ai_ci), así que "galon usado" encuentra
 * "Galones usados".
 *
 * @param {string} search   texto buscado
 * @param {string[]} columnas  ej. ['p.nombre', 'p.codigo']
 * @returns {{ clause: string, params: string[] }}  clause vacío si no hay búsqueda
 */
function buildSearch(search, columnas) {
  const palabras = (search || '').trim().split(/\s+/).filter(Boolean);
  if (!palabras.length) return { clause: '', params: [] };

  const grupos = [];
  const params = [];
  for (const palabra of palabras) {
    grupos.push('(' + columnas.map((c) => `${c} LIKE ?`).join(' OR ') + ')');
    const s = `%${palabra}%`;
    for (let i = 0; i < columnas.length; i++) params.push(s);
  }
  return { clause: grupos.join(' AND '), params };
}

module.exports = { buildSearch };
