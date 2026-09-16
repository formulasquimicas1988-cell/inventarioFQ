import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';

const INTERVALO_MS = 3000;      // polling cada 3s
const MULTI_COL_DESDE = 7;      // productos: pasa a 2 columnas internas si hay más
const EXPIRA_SEG = 300;         // 5 min: el backend deja de mandar el ticket
const FADE_DESDE_SEG = 240;     // desde 4 min empieza a desvanecerse
const NUEVO_SEG = 30;           // badge "NUEVO" y resalte rojo hasta 30s
const FILAS = 2;                // filas visibles por página (para el auto-paginado)
const ROTA_MS = 8000;           // cada cuánto rota de página en horas pico

// Clips de voz (grabados por el usuario) servidos como estáticos en /voz/*.mp3
const CLAVES_CLIPS = ['ticket', 'activado', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function formatCant(n) {
  const q = Number(n);
  if (Number.isInteger(q)) return String(q);
  return String(parseFloat(q.toFixed(2)));
}

function clamp(v, min, max, def) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

function textoEdad(s) {
  if (s < 60) return `hace ${Math.floor(s)}s`;
  return `hace ${Math.floor(s / 60)} min`;
}

function opacidadPorEdad(s) {
  if (s <= FADE_DESDE_SEG) return 1;
  if (s >= EXPIRA_SEG) return 0.12;
  return 1 - 0.88 * ((s - FADE_DESDE_SEG) / (EXPIRA_SEG - FADE_DESDE_SEG));
}

export default function Pantalla() {
  const [ventas, setVentas] = useState([]);
  const [activado, setActivado] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [, setTick] = useState(0); // fuerza re-render cada segundo (edades, reloj)

  const seenRef = useRef(null);       // Set de ids ya vistos; null = primera carga
  const audioRef = useRef(null);      // AudioContext (se crea al activar)
  const activadoRef = useRef(false);
  const clipsRef = useRef({});        // AudioBuffers de los clips de voz
  const cursorRef = useRef(0);        // reloj de audio para encolar voces
  const fetchAtRef = useRef(Date.now()); // cuándo llegó la última data (para extrapolar edad)

  // ── Ajustes por URL ────────────────────────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const COLS = clamp(parseInt(params.get('cols'), 10), 1, 6, 3);
  const FS = clamp(parseFloat(params.get('fs')), 0.6, 2.5, 1);
  const PER_PAGE = COLS * FILAS;

  // Edad real (extrapolada entre polls con el reloj local)
  const edadDe = useCallback((v) => {
    const extra = (Date.now() - fetchAtRef.current) / 1000;
    return Math.max(0, (v.segundos || 0) + extra);
  }, []);

  // ── Sonido: "ding" con Web Audio ───────────────────────────────────────────
  const beep = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 12;
    comp.connect(ctx.destination);
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.15;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.95, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(comp);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }, []);

  // ── Voz: clips grabados por el usuario (dígito por dígito) ──────────────────
  const precargarClips = useCallback(async (ctx) => {
    await Promise.all(CLAVES_CLIPS.map(async (k) => {
      try {
        const r = await fetch(`/voz/${k}.mp3`);
        const ab = await r.arrayBuffer();
        const buf = await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));
        clipsRef.current[k] = buf;
      } catch { /* clip faltante: se ignora */ }
    }));
  }, []);

  const reproducirSecuencia = useCallback((claves, retrasoInicial = 0) => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const GAP = 0.04;
    let t = Math.max(ctx.currentTime + 0.02 + retrasoInicial, cursorRef.current);
    for (const k of claves) {
      const buf = clipsRef.current[k];
      if (!buf) continue;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(t);
      t += buf.duration + GAP;
    }
    cursorRef.current = t;
  }, []);

  const decirTicket = useCallback((numero) => {
    reproducirSecuencia(['ticket', ...String(numero).split('')]);
  }, [reproducirSecuencia]);

  // ── Activación del audio (un solo toque al configurar la tele) ──────────────
  const activar = useCallback(async () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === 'suspended') ctx.resume();
        audioRef.current = ctx;
        cursorRef.current = ctx.currentTime;
      }
    } catch { /* sin Web Audio */ }

    setActivado(true);
    beep();
    if (audioRef.current) await precargarClips(audioRef.current);
    activadoRef.current = true;
    reproducirSecuencia(['activado'], 0.7);
  }, [beep, precargarClips, reproducirSecuencia]);

  // ── Carga de datos + detección de tickets nuevos ────────────────────────────
  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/api/pantalla-tk9x2/ventas');
      const lista = res.data?.ventas || [];
      fetchAtRef.current = Date.now();

      if (seenRef.current === null) {
        seenRef.current = new Set(lista.map(v => v.id));
      } else {
        const nuevos = lista.filter(v => !seenRef.current.has(v.id));
        if (nuevos.length && activadoRef.current) {
          beep();
          const ctx = audioRef.current;
          if (ctx) cursorRef.current = Math.max(cursorRef.current, ctx.currentTime + 0.7);
          [...nuevos].reverse().forEach(v => decirTicket(v.numero_ticket));
        }
        nuevos.forEach(v => seenRef.current.add(v.id));
      }

      const vivos = new Set(lista.map(v => v.id));
      seenRef.current = new Set([...seenRef.current].filter(id => vivos.has(id)));

      setVentas(lista);
    } catch {
      // Error de red: reintenta en el próximo intervalo
    }
  }, [beep, decirTicket]);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  // Tic de 1s: refresca edades, desvanecido y reloj
  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 1000000), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-paginado en horas pico (rota entre páginas si no caben todos)
  useEffect(() => {
    const paginas = Math.ceil(ventas.length / PER_PAGE) || 1;
    if (paginas <= 1) { setPagina(0); return; }
    const id = setInterval(() => setPagina(p => (p + 1) % paginas), ROTA_MS);
    return () => clearInterval(id);
  }, [ventas.length, PER_PAGE]);

  // Auto-recarga de madrugada (4:00 AM): baja versión nueva y refresca memoria
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 4 && now.getMinutes() === 0) window.location.reload();
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Mantener la pantalla despierta (best-effort)
  useEffect(() => {
    let lock = null;
    const pedir = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          lock = await navigator.wakeLock.request('screen');
        }
      } catch { /* no soportado */ }
    };
    pedir();
    const onVis = () => { if (document.visibilityState === 'visible') pedir(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      try { lock && lock.release(); } catch { /* ignore */ }
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  const paginas = Math.ceil(ventas.length / PER_PAGE) || 1;
  const pag = pagina % paginas;
  const visibles = ventas.slice(pag * PER_PAGE, pag * PER_PAGE + PER_PAGE);

  const ahora = new Date();
  const hora = ahora.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const fecha = ahora.toLocaleDateString('es-HN', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <div className="pt-root" style={{ '--fs': FS, '--cols': COLS }}>
      <style>{css}</style>

      <header className="pt-header">
        <div className="pt-hleft">
          <span className="pt-logo-chip"><img src="/logo.png" alt="FQ" className="pt-logo" /></span>
          <span className="pt-dot" />
          <span className="pt-title">VENTAS EN VIVO</span>
        </div>
        <div className="pt-hright">
          <span className="pt-hora">{hora}</span>
          <span className="pt-fecha">{fecha}</span>
        </div>
      </header>

      {ventas.length === 0 ? (
        <div className="pt-empty">
          <div className="pt-empty-icon">🧾</div>
          <div className="pt-empty-text">Esperando ventas…</div>
        </div>
      ) : (
        <>
          <main className="pt-grid">
            {visibles.map((v) => {
              const s = edadDe(v);
              const esNuevo = s < NUEVO_SEG;
              const multi = v.productos.length > MULTI_COL_DESDE;
              return (
                <article
                  key={v.id}
                  className={esNuevo ? 'pt-card pt-card--nuevo' : 'pt-card'}
                  style={{ opacity: opacidadPorEdad(s) }}
                >
                  {esNuevo && <span className="pt-badge">NUEVO</span>}
                  <div className="pt-card-top">
                    <span className="pt-tk-label">TICKET</span>
                    <span className="pt-tk-num">#{v.numero_ticket}</span>
                    <span className="pt-edad">{textoEdad(s)}</span>
                  </div>
                  <div className="pt-cliente">{v.nombre_cliente || 'Cliente'}</div>
                  <ul className={multi ? 'pt-plist pt-plist--multi' : 'pt-plist'}>
                    {v.productos.map((p, i) => (
                      <li key={i} className="pt-pitem">
                        <span className="pt-pcant">{formatCant(p.cantidad)}×</span>
                        <span className="pt-pdesc">{p.descripcion}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-conteo">🧾 {v.productos.length} producto(s)</div>
                </article>
              );
            })}
          </main>
          {paginas > 1 && (
            <div className="pt-pages">
              {Array.from({ length: paginas }).map((_, i) => (
                <span key={i} className={i === pag ? 'pt-page-dot pt-page-dot--on' : 'pt-page-dot'} />
              ))}
            </div>
          )}
        </>
      )}

      {!activado && (
        <div className="pt-overlay" onClick={activar} role="button">
          <div className="pt-overlay-inner">
            <div className="pt-overlay-icon">🔊</div>
            <div className="pt-overlay-title">Toca para activar el sonido</div>
            <div className="pt-overlay-sub">Solo una vez, al encender la tele</div>
          </div>
        </div>
      )}
    </div>
  );
}

const css = `
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 0; height: 0; }

  @keyframes ptPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
  @keyframes ptEntrada { from { transform: scale(0.96); } to { transform: scale(1); } }
  @keyframes ptBadge { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }

  .pt-root {
    position: fixed; inset: 0;
    background: linear-gradient(160deg, #07142e 0%, #0A1F44 100%);
    color: #fff;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    display: flex; flex-direction: column; overflow: hidden;
    user-select: none;
    padding: 2.4vh 2.2vw;
  }

  .pt-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 0 1.2vh; border-bottom: 4px solid #CC0000; flex-shrink: 0;
  }
  .pt-hleft { display: flex; align-items: center; gap: 1.1vw; }
  .pt-logo-chip {
    display: inline-flex; align-items: center; justify-content: center;
    background: #fff; border-radius: 0.9vw; padding: 0.5vh 0.6vw; flex-shrink: 0;
  }
  .pt-logo { height: 4.4vh; width: auto; display: block; }
  .pt-dot {
    width: 1.3vw; height: 1.3vw; min-width: 14px; min-height: 14px;
    border-radius: 50%; background: #CC0000; display: inline-block;
    animation: ptPulse 1.4s ease-in-out infinite;
  }
  .pt-title { font-size: calc(var(--fs) * 3vw); font-weight: 900; letter-spacing: 0.04em; }
  .pt-hright { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.05; }
  .pt-hora { font-size: 2vw; font-weight: 800; color: #dbe6fb; }
  .pt-fecha { font-size: 1.1vw; font-weight: 600; color: #9fb4d8; text-transform: capitalize; }

  .pt-grid {
    flex: 1; display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 1.6vh 1.8vw; padding: 1.8vh 0 0; overflow: hidden; align-content: start;
  }
  .pt-card {
    position: relative;
    background: #0f2a55; border: 3px solid #1d3d73; border-radius: 1.2vw;
    padding: 1.5vh 1.4vw; display: flex; flex-direction: column; gap: 0.9vh;
    align-self: start; min-width: 0;
    transition: opacity 0.8s linear;
  }
  .pt-card--nuevo {
    border: 4px solid #CC0000; box-shadow: 0 0 2.4vw rgba(204,0,0,0.55);
    animation: ptEntrada 0.5s ease-out;
  }
  .pt-badge {
    position: absolute; top: -1.2vh; right: 1vw;
    background: #CC0000; color: #fff; font-weight: 900;
    font-size: 1.2vw; letter-spacing: 0.08em;
    padding: 0.3vh 0.9vw; border-radius: 999px;
    animation: ptBadge 1s ease-in-out infinite;
  }
  .pt-card-top { display: flex; align-items: baseline; gap: 0.7vw; }
  .pt-tk-label { font-size: calc(var(--fs) * 1.1vw); font-weight: 700; color: #9fb4d8; letter-spacing: 0.1em; }
  .pt-tk-num { font-size: calc(var(--fs) * 2.9vw); font-weight: 900; color: #fff; line-height: 1; }
  .pt-edad { margin-left: auto; font-size: calc(var(--fs) * 1.1vw); font-weight: 600; color: #7f96bf; white-space: nowrap; }
  .pt-cliente {
    font-size: calc(var(--fs) * 1.9vw); font-weight: 800; color: #ff5a5a;
    border-bottom: 2px solid #1d3d73; padding-bottom: 0.7vh;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .pt-plist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5vh; }
  .pt-plist--multi { display: block; column-count: 2; column-gap: 1.4vw; }
  .pt-plist--multi .pt-pitem { margin-bottom: 0.5vh; break-inside: avoid; -webkit-column-break-inside: avoid; }
  .pt-pitem { display: flex; gap: 0.7vw; align-items: baseline; font-size: calc(var(--fs) * 1.45vw); line-height: 1.15; }
  .pt-pcant { font-weight: 900; color: #fff; min-width: calc(var(--fs) * 2.5vw); }
  .pt-pdesc { font-weight: 600; color: #dbe6fb; overflow-wrap: anywhere; }
  .pt-conteo { margin-top: 0.3vh; font-size: calc(var(--fs) * 1.15vw); font-weight: 700; color: #8fa6cf; }

  .pt-pages { display: flex; justify-content: center; gap: 1vw; padding-top: 1.2vh; flex-shrink: 0; }
  .pt-page-dot { width: 1vw; height: 1vw; min-width: 10px; min-height: 10px; border-radius: 50%; background: #1d3d73; }
  .pt-page-dot--on { background: #CC0000; }

  .pt-empty {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 3vh; color: #9fb4d8;
  }
  .pt-empty-icon { font-size: 10vw; opacity: 0.7; }
  .pt-empty-text { font-size: 3.4vw; font-weight: 800; }

  .pt-overlay {
    position: fixed; inset: 0; background: rgba(3,10,26,0.94);
    display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 50;
  }
  .pt-overlay-inner { text-align: center; display: flex; flex-direction: column; gap: 2.5vh; align-items: center; }
  .pt-overlay-icon { font-size: 12vw; }
  .pt-overlay-title { font-size: 4.5vw; font-weight: 900; color: #fff; }
  .pt-overlay-sub { font-size: 2.4vw; font-weight: 600; color: #9fb4d8; }
`;
