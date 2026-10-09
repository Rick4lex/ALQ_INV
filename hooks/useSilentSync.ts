import { useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';

export const useSilentSync = (intervalMs = 30000) => {
  // Se asume que tienes estas funciones expuestas en tu AppContext
  const { isSyncing, handleManualSync, isAnyModalOpen } = useAppContext();
  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const performSilentSync = async () => {
      // 1. No sincronizar si la pestaña está en segundo plano o minimizada
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      
      // 2. No sincronizar si ya hay un proceso activo
      if (isSyncing) return;

      // 3. No sincronizar si el usuario tiene un Modal abierto (editando)
      if (isAnyModalOpen && isAnyModalOpen()) return;

      try {
        await handleManualSync(true); // 'true' indica que es silencioso (sin loader)
      } catch (error) {
        console.warn("Fallo sincronización silenciosa. Se reintentará en el próximo ciclo:", error);
      }
    };

    // Refrescar automáticamente al volver a la pestaña
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        performSilentSync(); 
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Bucle de sincronización cada 30 seg (por defecto)
    syncTimer.current = setInterval(performSilentSync, intervalMs);

    return () => {
      if (syncTimer.current) clearInterval(syncTimer.current);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [isSyncing, handleManualSync, isAnyModalOpen, intervalMs]);
};
