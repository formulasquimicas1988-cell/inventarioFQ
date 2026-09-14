import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';

// Colores de marca, alto contraste para TV
const COLORS = {
  bg1: '#07142e',
  bg2: '#0A1F44',
  red: '#CC0000',
  white: '#FFFFFF',
  card: '#0f2a55',
  cardBorder: '#1d3d73',
  muted: '#9fb4d8',
};

const INTERVALO_MS = 7000; // polling cada 7s

function formatCant(n) {
  const q = Number(n);
  if (Number.isInteger(q)) return String(q);
  return String(parseFloat(q.toFixed(2)));
}

export default function Pantalla() {
  const [ventas, setVentas] = useState([]);
  const [activado, setActivado] = useState(false);

  const seenRef = useRef(null);      // Set de ids ya vistos; null = primera carga
  const audioRef = useRef(null);     // AudioContext (se crea al activar)
  const activadoRef = useRef(false); // espejo de `activado` para usar dentro de cargar()

  // ── Sonido: "ding" de dos tonos con Web Audio (sin archivos) ──────────────
  const beep = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.15;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }, []);

  // ── Voz: "Ticket N" con speechSynthesis del navegador ─────────────────────
  const decirTicket = useCallback((numero) => {
    try {
      const u = new SpeechSynthesisUtterance(`Ticket ${numero}`);
      u.lang = 'es-MX';
      u.rate = 0.95;
      u.pitch = 1;
      u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch {
      // navegador sin soporte de voz: se ignora
    }
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
    } catch {
      // sin Web Audio: seguimos igual, solo sin beep
    }
    // "Calentar" el motor de voz con una expresión muda para que la
    // primera venta real ya suene sin demora.
    try {
      window.speechSynthesis.getVoices();
      const warm = new SpeechSynthesisUtterance(' ');
      warm.volume = 0;
      window.speechSynthesis.speak(warm);
    } catch { /* ignore */ }

    activadoRef.current = true;
    setActivado(true);
  }, []);

  // ── Carga de datos + detección de tickets nuevos ──────────────────────────
  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/api/pantalla-tk9x2/ventas');
      const lista = res.data?.ventas || [];

      if (seenRef.current === null) {
        // Primera carga: NO anunciamos los tickets que ya existían
        seenRef.current = new Set(lista.map(v => v.id));
      } else {
        const nuevos = lista.filter(v => !seenRef.current.has(v.id));
        if (nuevos.length && activadoRef.current) {
          beep();
          // Anunciar del más viejo al más nuevo (la voz se encola sola)
          [...nuevos].reverse().forEach(v => decirTicket(v.numero_ticket));
        }
        nuevos.forEach(v => seenRef.current.add(v.id));
      }

      // Podar ids que ya no están en pantalla (evita que el Set crezca)
      const vivos = new Set(lista.map(v => v.id));
      seenRef.current = new Set([...seenRef.current].filter(id => vivos.has(id)));

      setVentas(lista);
    } catch {
      // Error de red: reintenta en el próximo intervalo, sin romper la pantalla
    }
  }, [beep, decirTicket]);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  return (
    <div style={styles.root}>
      <style>{css}</style>

      {/* Encabezado */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span className="pantalla-dot" style={styles.dot} />
          <span style={styles.title}>VENTAS EN VIVO</span>
        </div>
        <span style={styles.brand}>Fórmulas Químicas</span>
      </header>

      {/* Contenido */}
      {ventas.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🧾</div>
          <div style={styles.emptyText}>Esperando ventas…</div>
        </div>
      ) : (
        <main style={styles.grid}>
          {ventas.map((v, idx) => (
            <article
              key={v.id}
              className={idx === 0 ? 'pantalla-card pantalla-card--nuevo' : 'pantalla-card'}
              style={{
                ...styles.card,
                ...(idx === 0 ? styles.cardNuevo : null),
              }}
            >
              <div style={styles.cardTop}>
                <span style={styles.ticketLabel}>TICKET</span>
                <span style={styles.ticketNum}>#{v.numero_ticket}</span>
              </div>
              <div style={styles.cliente}>{v.nombre_cliente || 'Cliente'}</div>
              <ul style={styles.prodList}>
                {v.productos.map((p, i) => (
                  <li key={i} style={styles.prodItem}>
                    <span style={styles.prodCant}>{formatCant(p.cantidad)}×</span>
                    <span style={styles.prodDesc}>{p.descripcion}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </main>
      )}

      {/* Overlay de activación de sonido (se toca una sola vez) */}
      {!activado && (
        <div style={styles.overlay} onClick={activar} role="button">
          <div style={styles.overlayInner}>
            <div style={styles.overlayIcon}>🔊</div>
            <div style={styles.overlayTitle}>Toca para activar el sonido</div>
            <div style={styles.overlaySub}>Solo una vez, al encender la tele</div>
          </div>
        </div>
      )}
    </div>
  );
}

const css = `
  @keyframes pantallaPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
  @keyframes pantallaEntrada {
    from { transform: scale(0.96); box-shadow: 0 0 0 rgba(204,0,0,0); }
    to   { transform: scale(1); }
  }
  .pantalla-dot { animation: pantallaPulse 1.4s ease-in-out infinite; }
  .pantalla-card--nuevo { animation: pantallaEntrada 0.5s ease-out; }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 0; height: 0; }
`;

const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    background: `linear-gradient(160deg, ${COLORS.bg1} 0%, ${COLORS.bg2} 100%)`,
    color: COLORS.white,
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.4vh 2.5vw',
    borderBottom: `4px solid ${COLORS.red}`,
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1.2vw' },
  dot: {
    width: '1.6vw',
    height: '1.6vw',
    minWidth: 18,
    minHeight: 18,
    borderRadius: '50%',
    background: COLORS.red,
    display: 'inline-block',
  },
  title: { fontSize: '3.4vw', fontWeight: 900, letterSpacing: '0.04em' },
  brand: { fontSize: '2vw', fontWeight: 700, color: COLORS.muted },

  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(28vw, 1fr))',
    gap: '2vh 2vw',
    padding: '2.5vh 2.5vw',
    overflow: 'hidden',
    alignContent: 'start',
  },
  card: {
    background: COLORS.card,
    border: `3px solid ${COLORS.cardBorder}`,
    borderRadius: '1.4vw',
    padding: '2vh 1.8vw',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.4vh',
  },
  cardNuevo: {
    border: `4px solid ${COLORS.red}`,
    boxShadow: `0 0 3vw rgba(204,0,0,0.55)`,
  },
  cardTop: { display: 'flex', alignItems: 'baseline', gap: '1vw' },
  ticketLabel: { fontSize: '1.6vw', fontWeight: 700, color: COLORS.muted, letterSpacing: '0.1em' },
  ticketNum: { fontSize: '4vw', fontWeight: 900, color: COLORS.white, lineHeight: 1 },
  cliente: {
    fontSize: '2.4vw',
    fontWeight: 800,
    color: COLORS.red === '#CC0000' ? '#ff5a5a' : COLORS.red,
    borderBottom: `2px solid ${COLORS.cardBorder}`,
    paddingBottom: '1vh',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  prodList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8vh' },
  prodItem: { display: 'flex', gap: '1vw', alignItems: 'baseline', fontSize: '1.9vw', lineHeight: 1.15 },
  prodCant: { fontWeight: 900, color: COLORS.white, minWidth: '3.5vw' },
  prodDesc: { fontWeight: 600, color: '#dbe6fb' },

  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3vh',
    color: COLORS.muted,
  },
  emptyIcon: { fontSize: '10vw', opacity: 0.7 },
  emptyText: { fontSize: '3.4vw', fontWeight: 800 },

  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(3,10,26,0.94)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 50,
  },
  overlayInner: { textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2.5vh', alignItems: 'center' },
  overlayIcon: { fontSize: '12vw' },
  overlayTitle: { fontSize: '4.5vw', fontWeight: 900, color: COLORS.white },
  overlaySub: { fontSize: '2.4vw', fontWeight: 600, color: COLORS.muted },
};
