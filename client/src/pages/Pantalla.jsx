import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';

const INTERVALO_MS = 3000; // polling cada 3s (aparece casi al momento)

// Umbral: si un ticket tiene más de estos productos, la lista pasa a 2 columnas
const MULTI_COL_DESDE = 7;

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

export default function Pantalla() {
  const [ventas, setVentas] = useState([]);
  const [activado, setActivado] = useState(false);

  const seenRef = useRef(null);       // Set de ids ya vistos; null = primera carga
  const audioRef = useRef(null);      // AudioContext (se crea al activar)
  const activadoRef = useRef(false);  // espejo de `activado` para usar dentro de cargar()
  const voicesRef = useRef([]);       // voces disponibles de speechSynthesis

  // ── Ajustes por URL (se afinan desde la tele, sin redeploy) ───────────────
  //   ?cols=3   → número de columnas (1..6, por defecto 3)
  //   ?fs=1     → escala de la letra (0.6..2.5, por defecto 1)
  const params = new URLSearchParams(window.location.search);
  const COLS = clamp(parseInt(params.get('cols'), 10), 1, 6, 3);
  const FS = clamp(parseFloat(params.get('fs')), 0.6, 2.5, 1);

  // ── Sonido: "ding" de dos tonos con Web Audio (sin archivos) ──────────────
  const beep = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const comp = ctx.createDynamicsCompressor(); // maximiza volumen sin distorsión
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

  // ── Voz robusta (el Silk del Fire TV es viejo y se "duerme") ──────────────
  const pickVoice = () => {
    const vs = voicesRef.current || [];
    return (
      vs.find(v => /^es(-|_|$)/i.test(v.lang)) ||
      vs.find(v => /es/i.test(v.lang)) ||
      vs[0] ||
      null
    );
  };

  const hablar = useCallback((texto, volumen = 1) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const u = new SpeechSynthesisUtterance(texto);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = (v && v.lang) || 'es-MX';
      u.rate = 0.8; // un poco lento para que se entienda
      u.pitch = 1;
      u.volume = volumen;
      synth.resume();  // por si la cola quedó pausada
      synth.speak(u);
    } catch {
      // sin soporte de voz: se ignora
    }
  }, []);

  const decirTicket = useCallback((numero) => hablar(`Ticket ${numero}`), [hablar]);

  // Cargar voces + keepalive para que speechSynthesis no se "duerma"
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => { voicesRef.current = synth.getVoices() || []; };
    load();
    synth.onvoiceschanged = load;
    const ka = setInterval(() => {
      try { if (!synth.speaking) synth.resume(); } catch { /* ignore */ }
    }, 8000);
    return () => {
      clearInterval(ka);
      try { synth.onvoiceschanged = null; } catch { /* ignore */ }
    };
  }, []);

  // ── Activación del audio (un solo toque al configurar la tele) ────────────
  const activar = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === 'suspended') ctx.resume();
        audioRef.current = ctx;
      }
    } catch { /* sin Web Audio: seguimos sin beep */ }

    try { window.speechSynthesis.getVoices(); } catch { /* ignore */ }

    activadoRef.current = true;
    setActivado(true);

    // Confirmación inmediata: suena el beep y la voz dice "Sonido activado".
    // Así, al configurar la tele, confirmás al instante que el audio funciona.
    beep();
    hablar('Sonido activado', 1);
  }, [beep, hablar]);

  // ── Carga de datos + detección de tickets nuevos ──────────────────────────
  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/api/pantalla-tk9x2/ventas');
      const lista = res.data?.ventas || [];

      if (seenRef.current === null) {
        seenRef.current = new Set(lista.map(v => v.id)); // primera carga: no anunciar
      } else {
        const nuevos = lista.filter(v => !seenRef.current.has(v.id));
        if (nuevos.length && activadoRef.current) {
          beep();
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

  // Mantener la pantalla despierta (best-effort; refuerzo del ajuste del Fire TV)
  useEffect(() => {
    let lock = null;
    const pedir = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          lock = await navigator.wakeLock.request('screen');
        }
      } catch { /* no soportado: se ignora */ }
    };
    pedir();
    const onVis = () => { if (document.visibilityState === 'visible') pedir(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      try { lock && lock.release(); } catch { /* ignore */ }
    };
  }, []);

  return (
    <div className="pt-root" style={{ '--fs': FS, '--cols': COLS }}>
      <style>{css}</style>

      <header className="pt-header">
        <div className="pt-hleft">
          <span className="pt-dot" />
          <span className="pt-title">VENTAS EN VIVO</span>
        </div>
        <span className="pt-brand">Fórmulas Químicas</span>
      </header>

      {ventas.length === 0 ? (
        <div className="pt-empty">
          <div className="pt-empty-icon">🧾</div>
          <div className="pt-empty-text">Esperando ventas…</div>
        </div>
      ) : (
        <main className="pt-grid">
          {ventas.map((v, idx) => {
            const multi = v.productos.length > MULTI_COL_DESDE;
            return (
              <article key={v.id} className={idx === 0 ? 'pt-card pt-card--nuevo' : 'pt-card'}>
                <div className="pt-card-top">
                  <span className="pt-tk-label">TICKET</span>
                  <span className="pt-tk-num">#{v.numero_ticket}</span>
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
              </article>
            );
          })}
        </main>
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

  .pt-root {
    position: fixed; inset: 0;
    background: linear-gradient(160deg, #07142e 0%, #0A1F44 100%);
    color: #fff;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    display: flex; flex-direction: column; overflow: hidden;
    user-select: none;
    padding: 2.4vh 2.2vw; /* margen anti-overscan */
  }

  .pt-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 0 1.2vh; border-bottom: 4px solid #CC0000; flex-shrink: 0;
  }
  .pt-hleft { display: flex; align-items: center; gap: 1.2vw; }
  .pt-dot {
    width: 1.5vw; height: 1.5vw; min-width: 16px; min-height: 16px;
    border-radius: 50%; background: #CC0000; display: inline-block;
    animation: ptPulse 1.4s ease-in-out infinite;
  }
  .pt-title { font-size: calc(var(--fs) * 3vw); font-weight: 900; letter-spacing: 0.04em; }
  .pt-brand { font-size: calc(var(--fs) * 1.8vw); font-weight: 700; color: #9fb4d8; }

  .pt-grid {
    flex: 1; display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 1.8vh 1.8vw; padding: 2vh 0 0; overflow: hidden; align-content: start;
  }
  .pt-card {
    background: #0f2a55; border: 3px solid #1d3d73; border-radius: 1.2vw;
    padding: 1.6vh 1.4vw; display: flex; flex-direction: column; gap: 1vh;
    align-self: start; min-width: 0;
  }
  .pt-card--nuevo {
    border: 4px solid #CC0000; box-shadow: 0 0 2.4vw rgba(204,0,0,0.55);
    animation: ptEntrada 0.5s ease-out;
  }
  .pt-card-top { display: flex; align-items: baseline; gap: 0.8vw; }
  .pt-tk-label { font-size: calc(var(--fs) * 1.2vw); font-weight: 700; color: #9fb4d8; letter-spacing: 0.1em; }
  .pt-tk-num { font-size: calc(var(--fs) * 3vw); font-weight: 900; color: #fff; line-height: 1; }
  .pt-cliente {
    font-size: calc(var(--fs) * 1.9vw); font-weight: 800; color: #ff5a5a;
    border-bottom: 2px solid #1d3d73; padding-bottom: 0.8vh;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .pt-plist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6vh; }
  .pt-plist--multi { display: block; column-count: 2; column-gap: 1.4vw; }
  .pt-plist--multi .pt-pitem { margin-bottom: 0.6vh; break-inside: avoid; -webkit-column-break-inside: avoid; }
  .pt-pitem { display: flex; gap: 0.7vw; align-items: baseline; font-size: calc(var(--fs) * 1.5vw); line-height: 1.15; }
  .pt-pcant { font-weight: 900; color: #fff; min-width: calc(var(--fs) * 2.6vw); }
  .pt-pdesc { font-weight: 600; color: #dbe6fb; overflow-wrap: anywhere; }

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
