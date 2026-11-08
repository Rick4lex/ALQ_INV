import { useEffect, useRef, useCallback } from 'react';

interface InactivityTimerOptions {
  isEnabled: boolean;
  timeoutMinutes?: number;
  onTimeout: () => void;
}

/**
 * Hook para detectar inactividad del usuario en la interfaz.
 * Escucha eventos de mouse, teclado, scroll y toques en pantalla.
 * Al transcurrir el tiempo configurado sin actividad, ejecuta `onTimeout`.
 */
export function useInactivityTimer({
  isEnabled,
  timeoutMinutes = 15,
  onTimeout
}: InactivityTimerOptions) {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const onTimeoutRef = useRef(onTimeout);

  // Mantener referencia fresca a onTimeout sin recrear listeners
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!isEnabled) return;

    timerRef.current = setTimeout(() => {
      onTimeoutRef.current();
    }, timeoutMs);
  }, [isEnabled, timeoutMs]);

  useEffect(() => {
    if (!isEnabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Iniciar temporizador
    resetTimer();

    // Eventos a monitorizar
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    // Throttle para no sobrecargar el hilo de eventos del navegador
    let lastHandled = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastHandled > 2000) {
        lastHandled = now;
        resetTimer();
      }
    };

    events.forEach((eventType) => {
      window.addEventListener(eventType, handleActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((eventType) => {
        window.removeEventListener(eventType, handleActivity);
      });
    };
  }, [isEnabled, resetTimer]);

  return { resetTimer };
}
