import { useRef } from 'react';
import { cn } from '../../lib/utils';

/**
 * Botón protegido contra doble clic / doble toque.
 * Bloquea inmediatamente con un ref (síncrono, antes del re-render)
 * y se desbloquea cuando `disabled` vuelve a false o tras `lockMs`.
 */
export default function SafeButton({ onClick, disabled, children, className, lockMs = 2500, type = 'button' }) {
  const lockedRef = useRef(false);

  function handleClick(e) {
    if (lockedRef.current || disabled) return;
    lockedRef.current = true;
    onClick?.(e);
    // Desbloqueo de seguridad por si el padre no cambia `disabled`
    setTimeout(() => { lockedRef.current = false; }, lockMs);
  }

  return (
    <button
      type={type}
      className={cn(className, disabled && 'opacity-50 cursor-not-allowed')}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
